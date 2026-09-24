import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { Song } from '../types'
import { currentUser, firebaseEnabled, getDb } from './firebase'
import { deleteSong, listSongs, putSong } from './storage'

function songsRef(db: Firestore, uid: string) {
  return collection(db, 'users', uid, 'songs')
}

export async function saveSong(song: Song): Promise<void> {
  await putSong(song)
  const user = currentUser()
  if (!user) return
  try {
    await setDoc(doc(songsRef(getDb(), user.uid), song.id), song)
  } catch (e) {
    console.warn('cloud save failed', e)
  }
}

export async function removeSong(id: string): Promise<void> {
  await deleteSong(id)
  const user = currentUser()
  if (!user) return
  try {
    await deleteDoc(doc(songsRef(getDb(), user.uid), id))
  } catch (e) {
    console.warn('cloud delete failed', e)
  }
}

export async function syncAll(): Promise<{ pulled: number; pushed: number }> {
  const user = currentUser()
  if (!firebaseEnabled || !user) return { pulled: 0, pushed: 0 }

  const snap = await getDocs(songsRef(getDb(), user.uid))
  const remote = new Map<string, Song>()
  snap.forEach(d => remote.set(d.id, d.data() as Song))

  const local = await listSongs()
  let pulled = 0
  let pushed = 0

  for (const [id, rsong] of remote) {
    const lsong = local.find(s => s.id === id)
    if (!lsong || rsong.updatedAt > lsong.updatedAt) {
      await putSong(rsong)
      pulled++
    }
  }
  for (const lsong of local) {
    const rsong = remote.get(lsong.id)
    if (!rsong || lsong.updatedAt > rsong.updatedAt) {
      await setDoc(doc(songsRef(getDb(), user.uid), lsong.id), lsong)
      pushed++
    }
  }
  return { pulled, pushed }
}
