import type { Song } from '../types'

const DB_NAME = 'tabby'
const STORE = 'songs'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}

export function listSongs(): Promise<Song[]> {
  return tx<Song[]>('readonly', s => s.getAll() as IDBRequest<Song[]>).then(songs =>
    songs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )
}

export function getSong(id: string): Promise<Song | undefined> {
  return tx<Song | undefined>('readonly', s => s.get(id) as IDBRequest<Song | undefined>)
}

export function putSong(song: Song): Promise<IDBValidKey> {
  return tx('readwrite', s => s.put(song))
}

export function deleteSong(id: string): Promise<undefined> {
  return tx('readwrite', s => s.delete(id) as IDBRequest<undefined>)
}

const PREFS_KEY = 'tabby:prefs'

export type Prefs = { lastSongId?: string }

export function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Prefs
  } catch {
    return {}
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}
