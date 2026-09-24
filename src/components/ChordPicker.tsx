import { useEffect, useMemo, useRef, useState } from 'react'
import type { Chord, ChordQuality, NoteName, Tuning } from '../types'
import {
  CHORD_QUALITIES,
  SHARP_NOTES,
  FLAT_NOTES,
  chordDisplayName,
  chordQualityLabel,
  parseChord,
} from '../lib/music'
import { voicingsFor } from '../lib/voicings'
import { ChordDiagram } from './ChordDiagram'

const ROOTS = [...SHARP_NOTES, ...FLAT_NOTES.filter(n => !SHARP_NOTES.includes(n as never))] as NoteName[]

const QUALITY_SHORT: Record<ChordQuality, string> = {
  maj: '', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7♭5', dim: 'dim',
  dim7: 'dim7', aug: 'aug', sus2: 'sus2', sus4: 'sus4', '6': '6', m6: 'm6',
  '9': '9', m9: 'm9', maj9: 'maj9', add9: 'add9', '5': '5', '7sus4': '7sus4',
}

export function ChordPicker({
  tuning,
  initial,
  onPick,
  onClose,
}: {
  tuning: Tuning
  initial?: Chord
  onPick: (chord: Chord) => void
  onClose: () => void
}) {
  const [root, setRoot] = useState<NoteName>(initial?.root ?? 'G')
  const [quality, setQuality] = useState<ChordQuality>(initial?.quality ?? 'maj')
  const [bass, setBass] = useState<NoteName | undefined>(initial?.bass)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const parsed = useMemo(() => parseChord(query), [query])
  const chord: Chord = parsed ?? { root, quality, bass }
  const voicings = voicingsFor(chord, tuning)

  const submit = () => onPick(chord)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-[2px] p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose chord"
    >
      <div
        className="fade-up w-full sm:max-w-lg bg-surface border border-line sm:rounded-xl rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="font-display text-xl">Choose chord</h2>
          <button onClick={onClose} className="text-faint hover:text-ink text-xl leading-none px-2" aria-label="Close">
            ×
          </button>
        </div>

        <div className="px-5 pt-3">
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Search chords… (e.g. Gmaj7, D/F#)"
            className="w-full bg-paper border border-line rounded-md px-3 py-2 font-mono text-sm placeholder:text-faint"
            aria-label="Search chords"
          />
          {query && !parsed && (
            <p className="text-xs text-accent mt-1">No chord matches “{query}”</p>
          )}
        </div>

        {!parsed && (
          <>
            <div className="px-5 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-faint mb-2">Root</p>
              <div className="flex flex-wrap gap-1">
                {ROOTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setRoot(n)}
                    className={`min-w-9 px-2 py-1.5 rounded font-mono text-sm border ${
                      root === n
                        ? 'bg-chord text-white border-chord'
                        : 'border-line hover:border-chord/50 text-ink-soft'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-faint mb-2">Quality</p>
              <div className="grid grid-cols-4 gap-1">
                {CHORD_QUALITIES.map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    title={chordQualityLabel(q)}
                    className={`px-2 py-1.5 rounded font-mono text-sm border ${
                      quality === q
                        ? 'bg-chord text-white border-chord'
                        : 'border-line hover:border-chord/50 text-ink-soft'
                    }`}
                  >
                    {QUALITY_SHORT[q] || 'maj'}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 pt-4 pb-2">
              <p className="text-[11px] uppercase tracking-widest text-faint mb-2">
                Bass <span className="normal-case">(slash chord, optional)</span>
              </p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setBass(undefined)}
                  className={`px-2 py-1.5 rounded font-mono text-sm border ${
                    bass === undefined ? 'bg-chord text-white border-chord' : 'border-line text-ink-soft'
                  }`}
                >
                  —
                </button>
                {ROOTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setBass(n)}
                    className={`min-w-9 px-2 py-1.5 rounded font-mono text-sm border ${
                      bass === n ? 'bg-chord text-white border-chord' : 'border-line text-ink-soft'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="px-5 py-4 border-t border-line mt-3 flex items-center gap-4 bg-paper/60 sm:rounded-b-xl">
          <div className="flex-1">
            <p className="font-mono font-semibold text-2xl text-chord">{chordDisplayName(chord)}</p>
            {voicings.length > 0 ? (
              <ChordDiagram voicing={voicings[0]} tuning={tuning} width={96} />
            ) : (
              <p className="text-xs text-faint mt-2">No saved voicing for this tuning.</p>
            )}
          </div>
          <button
            onClick={submit}
            className="bg-accent hover:bg-accent-deep text-white font-medium px-5 py-2.5 rounded-md transition-colors"
          >
            Place chord
          </button>
        </div>
      </div>
    </div>
  )
}
