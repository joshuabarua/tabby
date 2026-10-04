import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { Song } from '../types'
import { getDb } from './firebase'
import { deleteSong, listSongs, putSong } from './storage'

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
