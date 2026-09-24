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
  replace: (song: Song) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  saved: boolean
}

const SongContext = createContext<SongContextValue | null>(null)

export function SongProvider({ initial, children }: { initial: Song; children: ReactNode }) {
  const [song, setSong] = useState<Song>(initial)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [saved, setSaved] = useState(true)
  const history = useRef(new History<Song>())
  const lastCoalesce = useRef<{ key: string; time: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = useCallback((fn: (draft: Song) => void, coalesceKey?: string) => {
    setSong(prev => {
      const now = Date.now()
      const coalesce =
        coalesceKey !== undefined &&
        lastCoalesce.current?.key === coalesceKey &&
        now - lastCoalesce.current.time < 1500
      if (!coalesce) history.current.push(prev)
      lastCoalesce.current = coalesceKey ? { key: coalesceKey, time: now } : null
      const draft = structuredClone(prev)
      fn(draft)
      draft.updatedAt = new Date().toISOString()
      return draft
    })
    setCanUndo(history.current.canUndo)
    setCanRedo(false)
    setSaved(false)
  }, [])

  const replace = useCallback((next: Song) => {
    setSong(next)
    history.current.clear()
    lastCoalesce.current = null
    setCanUndo(false)
    setCanRedo(false)
    setSaved(false)
  }, [])

  const undo = useCallback(() => {
    setSong(prev => {
      const restored = history.current.undo(prev)
      return restored ?? prev
    })
    lastCoalesce.current = null
    setCanUndo(history.current.canUndo)
    setCanRedo(history.current.canRedo)
  }, [])

  const redo = useCallback(() => {
    setSong(prev => {
      const restored = history.current.redo(prev)
      return restored ?? prev
    })
    lastCoalesce.current = null
    setCanUndo(history.current.canUndo)
    setCanRedo(history.current.canRedo)
  }, [])

  useEffect(() => {
    if (saved) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveSong(song).then(() => setSaved(true))
    }, 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [song, saved])

  const value = useMemo(
    () => ({ song, update, replace, undo, redo, canUndo, canRedo, saved }),
    [song, update, replace, undo, redo, canUndo, canRedo, saved],
  )
  return <SongContext.Provider value={value}>{children}</SongContext.Provider>
}

export function useSong(): SongContextValue {
  const ctx = useContext(SongContext)
  if (!ctx) throw new Error('useSong must be used inside SongProvider')
  return ctx
}
