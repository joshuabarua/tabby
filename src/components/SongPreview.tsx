import { useEffect } from 'react'
import { useSong } from '../state/SongContext'
import { getTuning } from '../lib/tunings'
import { chordLineText, sectionLabel } from '../lib/layout'

export function SongPreview({ onClose }: { onClose: () => void }) {
  const { song } = useSong()
  const tuning = getTuning(song.tuningId, song.customTunings)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meta = [
    song.artist,
    song.key ? `Key: ${song.key}` : null,
    `Tuning: ${tuning.name}`,
    song.capo > 0 ? `Capo: ${song.capo}` : null,
    song.bpm ? `${song.bpm} bpm` : null,
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex flex-col items-center py-8 px-3">
        <div
          className="fade-up bg-white shadow-2xl w-full max-w-[794px] min-h-[1000px] px-[8%] py-[6%]"
          onClick={e => e.stopPropagation()}
          role="document"
          aria-label="Song sheet preview"
        >
          <h1 className="font-display text-3xl text-center tracking-wide text-ink">
            {song.title.toUpperCase()}
          </h1>
          {meta.length > 0 && (
            <p className="text-center text-xs text-ink-soft mt-2 font-mono">{meta.join(' · ')}</p>
          )}
          <div className="mt-8 space-y-6">
            {song.sections.map(section => (
              <div key={section.id}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">
                  {sectionLabel(section)}
                </p>
                <div className="font-mono text-[13px] leading-6 text-ink">
                  {section.lines.map(line => {
                    const cl = chordLineText(line)
                    return (
                      <div key={line.id} className="whitespace-pre-wrap break-all">
                        {cl && <div className="text-chord font-semibold whitespace-pre">{cl}</div>}
                        <div>{line.text || ' '}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {song.notes && (
              <p className="text-xs text-ink-soft border-t border-line pt-3">{song.notes}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-surface rounded-md text-sm shadow hover:bg-paper"
        >
          Close preview (Esc)
        </button>
      </div>
    </div>
  )
}
