import { useEffect, useRef, useState } from 'react'
import type { Song } from '../types'
import { listSongs, putSong, deleteSong, getSong } from '../lib/storage'
import { newSong, validateSong, exportSongJson } from '../lib/song'
import { uid } from '../lib/id'

export function SongLibrary({ onOpen }: { onOpen: (song: Song) => void }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => void listSongs().then(setSongs)
  useEffect(refresh, [])

  const create = async () => {
    const song = newSong()
    await putSong(song)
    onOpen(song)
  }

  const duplicate = async (song: Song) => {
    const copy = structuredClone(song)
    copy.id = uid()
    copy.title = `${song.title} (copy)`
    copy.createdAt = copy.updatedAt = new Date().toISOString()
    await putSong(copy)
    refresh()
  }

  const remove = async (song: Song) => {
    if (!window.confirm(`Delete “${song.title}”? This can't be undone.`)) return
    await deleteSong(song.id)
    refresh()
  }

  const commitRename = async (song: Song) => {
    const title = renameValue.trim()
    if (title) {
      const fresh = (await getSong(song.id)) ?? song
      await putSong({ ...fresh, title, updatedAt: new Date().toISOString() })
    }
    setRenaming(null)
    refresh()
  }

  const importFile = async (file: File) => {
    setError(null)
    try {
      const data = JSON.parse(await file.text())
      const { song, error } = validateSong(data)
      if (!song) {
        setError(`Import failed: ${error}`)
        return
      }
      const existing = await getSong(song.id)
      if (existing) song.id = uid()
      await putSong(song)
      refresh()
    } catch {
      setError('Import failed: not a valid JSON file')
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl fade-up">
        <h1 className="font-display text-5xl sm:text-6xl tracking-tight">Tabby</h1>
        <p className="text-ink-soft mt-2 mb-8">
          Song sheets for guitar — chords above the words, right where they belong.
        </p>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-faint">My songs</h2>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm px-3 py-1.5 rounded-md border border-line hover:border-ink/40"
            >
              Import
            </button>
            <button
              onClick={create}
              className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-deep"
            >
              + New song
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) void importFile(f)
            e.target.value = ''
          }}
        />
        {error && <p className="text-sm text-accent mb-3">{error}</p>}

        {songs.length === 0 ? (
          <div className="border border-dashed border-line rounded-xl py-14 text-center text-faint">
            <p className="font-display text-2xl text-ink-soft mb-1">No songs yet</p>
            <p className="text-sm">Write your first song sheet — it stays on this device.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {songs.map(song => {
              const chordCount = song.sections.reduce(
                (n, s) => n + s.lines.reduce((m, l) => m + l.chords.length, 0),
                0,
              )
              return (
                <li key={song.id} className="group flex items-center gap-3 py-3">
                  {renaming === song.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => void commitRename(song)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') void commitRename(song)
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      className="flex-1 bg-surface border border-accent rounded px-2 py-1 font-display text-lg"
                    />
                  ) : (
                    <button
                      onClick={() => onOpen(song)}
                      className="flex-1 text-left font-display text-xl hover:text-accent transition-colors"
                    >
                      {song.title}
                    </button>
                  )}
                  <span className="text-xs text-faint font-mono hidden sm:block">
                    {song.sections.length}§ · {chordCount} chords
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setRenaming(song.id)
                        setRenameValue(song.title)
                      }}
                      className="px-2 py-1 text-xs rounded border border-line text-ink-soft hover:border-ink/40"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => void duplicate(song)}
                      className="px-2 py-1 text-xs rounded border border-line text-ink-soft hover:border-ink/40"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => exportSongJson(song)}
                      className="px-2 py-1 text-xs rounded border border-line text-ink-soft hover:border-ink/40"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => void remove(song)}
                      className="px-2 py-1 text-xs rounded border border-line text-accent hover:bg-accent hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-xs text-faint mt-6">
          Songs are stored locally in your browser. Export JSON to back up or move between devices.
        </p>
      </div>
    </div>
  )
}
