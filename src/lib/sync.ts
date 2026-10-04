import type { Song } from '../types'
import { currentUser, firebaseEnabled } from './firebase'
import { deleteSong, putSong } from './storage'

export async function saveSong(song: Song): Promise<void> {
  await putSong(song)
  const user = currentUser()
  if (!user) return
  try {
    const { saveCloudSong } = await import('./cloudSync')
    await saveCloudSong(song)
  } catch (e) {
    console.warn('cloud save failed', e)
  }
}

export async function removeSong(id: string): Promise<void> {
  await deleteSong(id)
  const user = currentUser()
  if (!user) return
  try {
    const { removeCloudSong } = await import('./cloudSync')
    await removeCloudSong(id)
  } catch (e) {
    console.warn('cloud delete failed', e)
  }
}

export async function syncAll(): Promise<{ pulled: number; pushed: number; removed: number }> {
  const user = currentUser()
  const none = { pulled: 0, pushed: 0, removed: 0 }
  if (!firebaseEnabled || !user) return none
  const { syncCloudSongs } = await import('./cloudSync')
  return syncCloudSongs()
}
