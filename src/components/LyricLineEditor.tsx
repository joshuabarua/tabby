import { useEffect, useRef, useState } from 'react'
import type { Chord, LyricLine } from '../types'
import { chordDisplayName } from '../lib/music'

export function LyricLineEditor({
  line,
  armed,
  focused,
  onText,
  onSplit,
  onMergeUp,
  onMoveFocus,
  onStripClick,
  onChordClick,
  onCaret,
  registerInput,
}: {
  line: LyricLine
  armed: Chord | null
  focused?: boolean
  onText: (text: string) => void
  onSplit: (at: number) => void
  onMergeUp: () => void
  onMoveFocus: (dir: -1 | 1, column: number) => void
  onStripClick: (position: number) => void
  onChordClick: (placedId: string, x: number, y: number) => void
  onCaret: (pos: number) => void
  registerInput: (id: string, el: HTMLInputElement | null) => void
}) {
  const measureRef = useRef<HTMLSpanElement>(null)
  const [hoverPos, setHoverPos] = useState<number | null>(null)
  const [chW, setChW] = useState(8)

  useEffect(() => {
    const measure = () => {
      const w = measureRef.current?.getBoundingClientRect().width
      if (w) setChW(w)
    }
    measure()
    void document.fonts?.ready.then(measure)
  }, [])

  const chWidth = () => chW

  const posFromEvent = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(line.text.length, Math.round(x / chWidth())))
  }

  return (
    <div className="relative w-fit min-w-full">
      {/* chord strip */}
      <div
        className={`relative h-5 font-mono text-[13px] leading-5 whitespace-pre select-none ${
          armed ? 'cursor-crosshair' : 'cursor-text'
        }`}
        onClick={e => onStripClick(posFromEvent(e))}
        onMouseMove={e => setHoverPos(posFromEvent(e))}
        onMouseLeave={() => setHoverPos(null)}
        role="button"
        aria-label={`Add chord above line: ${line.text || 'empty line'}`}
        tabIndex={-1}
      >
        <span ref={measureRef} className="invisible absolute" aria-hidden>
          0
        </span>
        {hoverPos !== null && (
          <span
            className={`absolute top-0 ${armed ? 'text-accent' : 'text-faint/70'}`}
            style={{ left: hoverPos * chWidth() }}
          >
            {armed ? chordDisplayName(armed) : '+'}
          </span>
        )}
        {line.chords.map(pc => (
          <span
            key={pc.id}
            className="chord-name absolute top-0"
            style={{ left: pc.position * chWidth() }}
            onClick={e => {
              e.stopPropagation()
              const r = (e.target as HTMLElement).getBoundingClientRect()
              onChordClick(pc.id, r.left + r.width / 2, r.bottom)
            }}
            role="button"
            aria-label={`Chord ${chordDisplayName(pc.chord)}`}
          >
            {chordDisplayName(pc.chord)}
          </span>
        ))}
      </div>
      {/* lyric input */}
      <input
        ref={el => registerInput(line.id, el)}
        className="lyric-input text-[15px] leading-6 text-ink"
        style={{ width: `${Math.max(line.text.length, 1)}ch`, minWidth: '8ch', maxWidth: '100%' }}
        value={line.text}
        placeholder="· lyric line"
        autoFocus={focused}
        onChange={e => onText(e.target.value)}
        onSelect={e => onCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
        onKeyDown={e => {
          const el = e.currentTarget
          const pos = el.selectionStart ?? 0
          if (e.key === 'Enter') {
            e.preventDefault()
            onSplit(pos)
          } else if (e.key === 'Backspace' && pos === 0 && el.selectionEnd === 0) {
            e.preventDefault()
            onMergeUp()
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            onMoveFocus(-1, pos)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            onMoveFocus(1, pos)
          }
        }}
        aria-label="Lyric line"
      />
    </div>
  )
}
