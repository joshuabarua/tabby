import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { Song } from '../types'
import { getDb } from './firebase'
import { deleteSong, getSong, listSongs, putSong } from './storage'
import { planRemoteChange } from './remote'

function songsRef(db: Firestore) {
  return collection(db, 'songs')
}

function deletionsRef(db: Firestore) {
  return doc(db, 'meta', 'deletions')
}

type Deletions = Record<string, string>

async function getDeletions(db: Firestore): Promise<Deletions> {
  const snap = await getDoc(deletionsRef(db))
  return snap.exists() ? ((snap.data().songs ?? {}) as Deletions) : {}
}

export async function saveCloudSong(song: Song): Promise<void> {
  const db = await getDb()
  await setDoc(doc(songsRef(db), song.id), song)
  await setDoc(deletionsRef(db), { songs: { [song.id]: null } }, { merge: true })
}

export async function removeCloudSong(id: string): Promise<void> {
  const db = await getDb()
  await deleteDoc(doc(songsRef(db), id))
  await setDoc(
    deletionsRef(db),
    { songs: { [id]: new Date().toISOString() } },
    { merge: true },
  )
}

export async function syncCloudSongs(): Promise<{ pulled: number; pushed: number; removed: number }> {
  const db = await getDb()
  const snap = await getDocs(songsRef(db))
  const remote = new Map<string, Song>()
  snap.forEach(d => remote.set(d.id, d.data() as Song))
  const deletions = await getDeletions(db)

  const local = await listSongs()
  let pulled = 0
  let pushed = 0
  let removed = 0

  for (const [id, rsong] of remote) {
    const lsong = local.find(s => s.id === id)
    const deletedAt = deletions[id]
    if (deletedAt && deletedAt >= rsong.updatedAt) {
      await deleteDoc(doc(songsRef(db), id))
      if (lsong) await deleteSong(id)
      removed++
      continue
    }
    if (!lsong) {
      await putSong(rsong)
      pulled++
    } else if (rsong.updatedAt > lsong.updatedAt) {
      await putSong(rsong)
      pulled++
    }
  }

  for (const lsong of local) {
    const rsong = remote.get(lsong.id)
    const deletedAt = deletions[lsong.id]
    if (deletedAt && deletedAt >= lsong.updatedAt && !rsong) {
      await deleteSong(lsong.id)
      removed++
      continue
    }
    if (!rsong || lsong.updatedAt > rsong.updatedAt) {
      await setDoc(doc(songsRef(db), lsong.id), lsong)
      pushed++
    }
  }
  return { pulled, pushed, removed }
}

export type RemoteEvent = { type: 'pulled'; song: Song } | { type: 'removed'; id: string }

/**
 * Live updates: songs changed or deleted elsewhere (another device, or the
 * other person sharing the library) are written to IndexedDB as they arrive.
 * Our own not-yet-acknowledged writes are skipped.
 */
export async function subscribeCloudSongs(
  onEvent: (e: RemoteEvent) => void,
  onError: (e: Error) => void,
): Promise<() => void> {
  const db = await getDb()
  return onSnapshot(
    songsRef(db),
    snap => {
      void (async () => {
        for (const change of snap.docChanges()) {
          if (change.doc.metadata.hasPendingWrites) continue
          if (change.type === 'removed') {
            if (snap.metadata.fromCache) continue
            const local = await getSong(change.doc.id)
            if (local) {
              await deleteSong(change.doc.id)
              onEvent({ type: 'removed', id: change.doc.id })
            }
            continue
          }
          const remote = change.doc.data() as Song
          const local = await getSong(remote.id)
          if (planRemoteChange(local, remote) === 'pull') {
            await putSong(remote)
            onEvent({ type: 'pulled', song: remote })
          }
        }
      })().catch(onError)
    },
    onError,
  )
}
