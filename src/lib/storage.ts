import type { Song } from '../types'

const DB_NAME = 'tabby'
const STORE = 'songs'
const VERSION = 1

// One shared connection: opening is async, and a save started while the page
// is being hidden or closed must reach IndexedDB before the page goes away.
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      const reset = () => {
        db.close()
        if (dbPromise === opened) dbPromise = null
      }
      db.onversionchange = reset
      db.onclose = reset
      resolve(db)
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  const opened = dbPromise
  return opened
}

/** Drop the cached connection (tests swap in a fresh IndexedDB). */
export function resetDbConnection(): void {
  void dbPromise?.then(db => db.close()).catch(() => {})
  dbPromise = null
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        // Ask for an immediate commit so a save issued while the page is
        // closing isn't left waiting on auto-commit.
        if (mode === 'readwrite') t.commit?.()
        // Resolve on commit, not on request success: a write isn't durable
        // until the transaction completes, and callers (e.g. save-before-leave)
        // rely on that.
        t.oncomplete = () => resolve(req.result)
        t.onerror = () => reject(t.error ?? req.error)
        t.onabort = () => reject(t.error ?? new Error('IndexedDB transaction aborted'))
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
