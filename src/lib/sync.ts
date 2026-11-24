import type { Song } from '../types'
import { currentUser, firebaseEnabled, onUserChanged } from './firebase'
import { deleteSong, putSong } from './storage'
import type { RemoteEvent } from './cloudSync'

// ---- sync status ------------------------------------------------------------

export type SyncStatus = 'local' | 'synced' | 'pending' | 'offline' | 'error'

let pendingWrites = 0
let lastWriteFailed = false
const statusListeners = new Set<() => void>()

function notifyStatus() {
  for (const cb of statusListeners) cb()
}

export function getSyncStatus(): SyncStatus {
  if (!firebaseEnabled || !currentUser()) return 'local'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (pendingWrites > 0) return 'pending'
  return lastWriteFailed ? 'error' : 'synced'
}

/** Subscribe to anything that can change the sync status. */
export function subscribeSyncStatus(cb: () => void): () => void {
  statusListeners.add(cb)
  const offUser = onUserChanged(() => cb())
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    statusListeners.delete(cb)
    offUser()
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function trackCloudWrite(label: string, write: Promise<void>): Promise<void> {
  pendingWrites++
  notifyStatus()
  return write
    .then(() => {
      lastWriteFailed = false
    })
    .catch(e => {
      lastWriteFailed = true
      console.warn(label, e)
    })
    .finally(() => {
      pendingWrites--
      notifyStatus()
    })
}

// ---- library change events ---------------------------------------------------

const remoteListeners = new Set<(e: RemoteEvent) => void>()
const libraryListeners = new Set<() => void>()

/** Fires when a song is pulled or removed by a cloud update. */
export function onRemoteEvent(cb: (e: RemoteEvent) => void): () => void {
  remoteListeners.add(cb)
  return () => remoteListeners.delete(cb)
}

/** Fires when the local library changed because of sync. */
export function onLibraryChanged(cb: () => void): () => void {
  libraryListeners.add(cb)
  return () => libraryListeners.delete(cb)
}

function emitLibraryChanged() {
  for (const cb of libraryListeners) cb()
}

// ---- writes -----------------------------------------------------------------

/**
 * Saves locally and, when signed in, queues a cloud write. Resolves once the
 * local write is done; the cloud write continues in the background (Firestore
 * keeps it queued while offline) and is reflected in the sync status.
 */
export async function saveSong(song: Song): Promise<void> {
  await putSong(song)
  if (!currentUser()) return
  try {
    const { saveCloudSong } = await import('./cloudSync')
    void trackCloudWrite('cloud save failed', saveCloudSong(song))
  } catch (e) {
    console.warn('cloud save failed', e)
  }
}

export async function removeSong(id: string): Promise<void> {
  await deleteSong(id)
  if (!currentUser()) return
  try {
    const { removeCloudSong } = await import('./cloudSync')
    void trackCloudWrite('cloud delete failed', removeCloudSong(id))
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

/**
 * Keeps the local library in step with the cloud for as long as someone is
 * signed in: a full merge whenever auth is restored (page load or sign-in),
 * then live updates. Returns a stop function.
 */
export function startCloudSync(): () => void {
  if (!firebaseEnabled) return () => {}
  let unsubscribe: (() => void) | null = null
  let generation = 0

  const stopLive = () => {
    unsubscribe?.()
    unsubscribe = null
  }

  const offUser = onUserChanged(user => {
    const gen = ++generation
    stopLive()
    if (!user) return
    void (async () => {
      try {
        const result = await syncAll()
        if (gen !== generation) return
        if (result.pulled || result.removed) emitLibraryChanged()
        const { subscribeCloudSongs } = await import('./cloudSync')
        const unsub = await subscribeCloudSongs(
          e => {
            for (const cb of remoteListeners) cb(e)
            emitLibraryChanged()
          },
          e => {
            lastWriteFailed = true
            notifyStatus()
            console.warn('cloud listener failed', e)
          },
        )
        if (gen !== generation) unsub()
        else unsubscribe = unsub
      } catch (e) {
        lastWriteFailed = true
        notifyStatus()
        console.warn('cloud sync failed', e)
      }
    })()
  })

  return () => {
    generation++
    offUser()
    stopLive()
  }
}
