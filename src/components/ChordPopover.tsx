import { useEffect, useRef, useState } from 'react'
import type { Chord, PlacedChord, Tuning } from '../types'
import { chordDescription, chordDisplayName, chordTones, soundingChord } from '../lib/music'
import { voicingsFor } from '../lib/voicings'
import { ChordDiagram } from './ChordDiagram'

export function ChordPopover({
  placed,
  tuning,
  capo,
  anchor,
  onSelectVoicing,
  onEditChord,
  onDelete,
  onClose,
}: {
  placed: PlacedChord
  tuning: Tuning
  capo: number
  anchor: { x: number; y: number }
  onSelectVoicing: (voicingId: string) => void
  onEditChord: (chord: Chord) => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [voicingIdx, setVoicingIdx] = useState(0)
  const voicings = voicingsFor(placed.chord, tuning)
  const current = voicings.find(v => v.id === placed.voicingId) ?? voicings[voicingIdx] ?? voicings[0]

  useEffect(() => {
    const i = voicings.findIndex(v => v.id === placed.voicingId)
    if (i >= 0) setVoicingIdx(i)
  }, [placed.voicingId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [onClose])

  const width = 320
  const left = Math.max(8, Math.min(anchor.x - width / 2, window.innerWidth - width - 8))
  const top = Math.min(anchor.y + 14, window.innerHeight - 420)

  return (
    <div
      ref={ref}
      className="fade-up fixed z-50 bg-surface border border-line rounded-xl shadow-2xl"
      style={{ left, top, width }}
      role="dialog"
      aria-label={`Chord ${chordDisplayName(placed.chord)}`}
    >
      <div className="px-4 pt-3 pb-2 border-b border-line flex items-start justify-between">
        <div>
          <p className="font-mono font-semibold text-xl text-chord leading-tight">
            {chordDisplayName(placed.chord)}
          </p>
          <p className="text-xs text-ink-soft">{chordDescription(placed.chord)}</p>
        </div>
        <button onClick={onClose} className="text-faint hover:text-ink px-1" aria-label="Close">
          ×
        </button>
      </div>

      <div className="px-4 py-2 text-xs text-ink-soft space-y-0.5 border-b border-line">
        <p>
          Notes: <span className="font-mono">{chordTones(placed.chord).join(' ')}</span>
        </p>
        <p>Tuning: {tuning.name}</p>
        {capo > 0 && (
          <p>
            Capo {capo} · sounds as{' '}
            <span className="font-mono">{chordDisplayName(soundingChord(placed.chord, capo))}</span>
          </p>
        )}
      </div>

      <div className="px-4 py-3">
        {voicings.length === 0 ? (
          <p className="text-sm text-faint py-4 text-center">
            No saved voicing for this tuning.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] uppercase tracking-widest text-faint">
                Voicing {voicingIdx + 1} of {voicings.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setVoicingIdx(i => (i - 1 + voicings.length) % voicings.length)}
                  className="w-7 h-7 rounded border border-line text-ink-soft hover:border-chord/50"
                  aria-label="Previous voicing"
                >
                  ‹
                </button>
                <button
                  onClick={() => setVoicingIdx(i => (i + 1) % voicings.length)}
                  className="w-7 h-7 rounded border border-line text-ink-soft hover:border-chord/50"
                  aria-label="Next voicing"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="flex justify-center py-1">
              {current && <ChordDiagram voicing={current} tuning={tuning} width={120} />}
            </div>
            <p className="text-center text-xs text-ink-soft mb-2">
              {current?.name ?? 'Voicing'}
              {current?.generated ? ' · generated' : ''}
            </p>
            <button
              onClick={() => current && onSelectVoicing(current.id)}
              className="w-full py-1.5 rounded-md border border-chord text-chord text-sm font-medium hover:bg-chord hover:text-white transition-colors"
            >
              {current?.id === placed.voicingId ? 'Selected' : 'Choose this voicing'}
            </button>
          </>
        )}
      </div>

      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => onEditChord(placed.chord)}
          className="flex-1 py-1.5 text-sm rounded-md border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
        >
          Change chord
        </button>
        <button
          onClick={onDelete}
          className="flex-1 py-1.5 text-sm rounded-md border border-line text-accent hover:bg-accent hover:text-white transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
