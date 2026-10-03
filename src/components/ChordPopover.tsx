import { useEffect, useRef } from 'react'
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
  const voicings = voicingsFor(placed.chord, tuning)

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
            <p className="text-[11px] uppercase tracking-widest text-faint mb-2">
              Voicings — click to swap
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {voicings.map(v => {
                const selected = (placed.voicingId ?? voicings[0].id) === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVoicing(v.id)}
                    className={`shrink-0 rounded-lg border p-1.5 transition-colors ${
                      selected
                        ? 'border-chord bg-chord-bg'
                        : 'border-line hover:border-chord/60'
                    }`}
                    aria-label={`Voicing ${v.name ?? ''}`}
                    aria-pressed={selected}
                  >
                    <ChordDiagram voicing={v} tuning={tuning} width={66} />
                    <p className="text-[10px] text-center text-ink-soft mt-0.5 leading-tight max-w-16 truncate">
                      {v.name ?? 'Voicing'}
                    </p>
                    <div className="flex justify-center gap-1 mt-0.5">
                      {v.barres && v.barres.length > 0 && (
                        <span className="text-[9px] uppercase tracking-wide bg-ink text-paper rounded px-1 leading-3.5">
                          barre
                        </span>
                      )}
                      {v.generated && (
                        <span className="text-[9px] text-faint leading-3.5">auto</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
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
