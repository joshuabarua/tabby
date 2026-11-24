import { useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { songFromChart } from '../lib/chart'

const EXAMPLE = `Title: Example Song
Key: G

[Verse 1]
G           C        G
Write your chords on top
        D             G
and the words underneath

[Chorus]
[C]Inline [G]ChordPro chords [D]work too`

export function PasteChartDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (song: Song) => void | Promise<void>
}) {
  const [text, setText] = useState('')
  const result = useMemo(() => (text.trim() ? songFromChart(text) : null), [text])
  const song = result?.song

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stats = song
    ? {
        sections: song.sections.length,
        lines: song.sections.reduce((n, s) => n + s.lines.length, 0),
        chords: song.sections.reduce((n, s) => n + s.lines.reduce((m, l) => m + l.chords.length, 0), 0),
      }
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-[2px] p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Paste a chord chart"
    >
      <div
        className="fade-up w-full sm:max-w-2xl bg-surface border border-line sm:rounded-xl rounded-t-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xl">Paste a chord chart</h2>
          <button onClick={onClose} className="text-faint hover:text-ink px-2" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="text-sm text-ink-soft mb-3">
          Chords above lyrics, inline <code className="font-mono">[G]</code> chords, and section
          headers like <code className="font-mono">[Chorus]</code> are recognised.
        </p>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={14}
          spellCheck={false}
          aria-label="Chord chart text"
          className="w-full font-mono text-[13px] leading-5 bg-paper/70 border border-line rounded-md px-3 py-2 whitespace-pre overflow-x-auto"
        />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="text-xs text-faint flex-1 min-w-40">
            {stats
              ? `${song!.title} · ${stats.sections} section${stats.sections === 1 ? '' : 's'} · ${stats.lines} lines · ${stats.chords} chords`
              : result?.error ?? 'Paste a chart to see what will be imported.'}
          </span>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md border border-line hover:border-ink/40"
          >
            Cancel
          </button>
          <button
            disabled={!song}
            onClick={() => song && void onCreate(song)}
            className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-deep disabled:opacity-40"
          >
            Create song
          </button>
        </div>
      </div>
    </div>
  )
}
