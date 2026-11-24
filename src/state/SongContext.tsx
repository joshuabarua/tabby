import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Song } from '../types'
import { History } from './history'
import { saveSong } from '../lib/sync'

type SongContextValue = {
  song: Song
  update: (fn: (draft: Song) => void, coalesceKey?: string) => void
  /** Swap in a different version (e.g. one from the cloud). Clears history. */
  replace: (song: Song, opts?: { persisted?: boolean }) => void
  /** Re-save what's on screen with a fresh timestamp so it wins over other copies. */
  keepLocal: () => void
  undo: () => void
  redo: () => void
  /** Write any pending change now. */
  flush: () => Promise<void>
  canUndo: boolean
  canRedo: boolean
  saved: boolean
}

const SongContext = createContext<SongContextValue | null>(null)

const SAVE_DELAY = 600
const COALESCE_MS = 1500

export function SongProvider({ initial, children }: { initial: Song; children: ReactNode }) {
  const [song, setSong] = useState<Song>(initial)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [saved, setSaved] = useState(true)
  const history = useRef(new History<Song>())
  const lastCoalesce = useRef<{ key: string; time: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Source of truth for the latest state, so mutations never run side effects
  // inside a React state updater (which StrictMode calls twice).
  const current = useRef(initial)
  // The version that still needs writing, if any.
  const dirty = useRef<Song | null>(null)

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const pending = dirty.current
    if (!pending) return
    dirty.current = null
    await saveSong(pending)
    if (!dirty.current) setSaved(true)
  }, [])

  const commit = useCallback(
    (next: Song, opts: { persisted?: boolean } = {}) => {
      current.current = next
      setSong(next)
      setCanUndo(history.current.canUndo)
      setCanRedo(history.current.canRedo)
      if (opts.persisted) return
      dirty.current = next
      setSaved(false)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => void flush(), SAVE_DELAY)
    },
    [flush],
  )

  const update = useCallback(
    (fn: (draft: Song) => void, coalesceKey?: string) => {
      const prev = current.current
      const now = Date.now()
      const coalesce =
        coalesceKey !== undefined &&
        lastCoalesce.current?.key === coalesceKey &&
        now - lastCoalesce.current.time < COALESCE_MS
      if (!coalesce) history.current.push(prev)
      lastCoalesce.current = coalesceKey ? { key: coalesceKey, time: now } : null
      const draft = structuredClone(prev)
      fn(draft)
      draft.updatedAt = new Date().toISOString()
      commit(draft)
    },
    [commit],
  )

  const replace = useCallback(
    (next: Song, opts?: { persisted?: boolean }) => {
      history.current.clear()
      lastCoalesce.current = null
      commit(next, opts)
    },
    [commit],
  )

  const keepLocal = useCallback(() => {
    commit({ ...current.current, updatedAt: new Date().toISOString() })
  }, [commit])

  // Restored snapshots get a fresh timestamp: an undo is a new edit as far as
  // saving and sync are concerned.
  const restore = useCallback(
    (snapshot: Song | null) => {
      if (!snapshot) return
      lastCoalesce.current = null
      commit({ ...snapshot, updatedAt: new Date().toISOString() })
    },
    [commit],
  )

  const undo = useCallback(() => restore(history.current.undo(current.current)), [restore])
  const redo = useCallback(() => restore(history.current.redo(current.current)), [restore])

  // Never drop the last edits: save when the tab is hidden or closed, and when
  // the editor unmounts (e.g. going back to the library).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onPageHide = () => void flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      void flush()
    }
  }, [flush])

  const value = useMemo(
    () => ({ song, update, replace, keepLocal, undo, redo, flush, canUndo, canRedo, saved }),
    [song, update, replace, keepLocal, undo, redo, flush, canUndo, canRedo, saved],
  )
  return <SongContext.Provider value={value}>{children}</SongContext.Provider>
}

export function useSong(): SongContextValue {
  const ctx = useContext(SongContext)
  if (!ctx) throw new Error('useSong must be used inside SongProvider')
  return ctx
}
