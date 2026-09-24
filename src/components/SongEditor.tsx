import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chord, Section, SectionType } from '../types'
import { useSong } from '../state/SongContext'
import { getTuning, BUILTIN_TUNINGS } from '../lib/tunings'
import { chordDisplayName, transposeChord, transposeNote } from '../lib/music'
import { newLine, newSection, placedChord } from '../lib/song'
import { saveSong } from '../lib/sync'
import { LyricLineEditor } from './LyricLineEditor'
import { ChordPicker } from './ChordPicker'
import { ChordPopover } from './ChordPopover'
import { SongPreview } from './SongPreview'
import { PdfExportDialog } from './pdf/PdfExportDialog'
import { SectionHeader } from './SectionHeader'
import { AuthButton } from './AuthButton'

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'prechorus', label: 'Pre-chorus' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'instrumental', label: 'Instrumental' },
  { value: 'outro', label: 'Outro' },
  { value: 'custom', label: 'Custom' },
]

const PALETTE: Chord[] = [
  { root: 'C', quality: 'maj' },
  { root: 'D', quality: 'maj' },
  { root: 'E', quality: 'maj' },
  { root: 'F', quality: 'maj' },
  { root: 'G', quality: 'maj' },
  { root: 'A', quality: 'maj' },
  { root: 'B', quality: 'maj' },
  { root: 'A', quality: 'm' },
  { root: 'B', quality: 'm' },
  { root: 'C', quality: 'm' },
  { root: 'D', quality: 'm' },
  { root: 'E', quality: 'm' },
  { root: 'G', quality: '7' },
]

type PickerState = { secIdx: number; lineIdx: number; pos: number; replaceId?: string; initial?: Chord }
type PopState = { secIdx: number; lineIdx: number; placedId: string; x: number; y: number }

export function SongEditor({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { song, update, undo, redo, canUndo, canRedo, saved } = useSong()
  const tuning = getTuning(song.tuningId, song.customTunings)

  const [armed, setArmed] = useState<Chord | null>(null)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [pop, setPop] = useState<PopState | null>(null)
  const [transposeOpen, setTransposeOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [metaOpen, setMetaOpen] = useState(false)

  const inputs = useRef(new Map<string, HTMLInputElement>())
  const pendingFocus = useRef<{ id: string; col: number } | null>(null)
  const lastCaret = useRef({ secIdx: 0, lineIdx: 0, pos: 0 })

  const flatLines = useMemo(
    () =>
      song.sections.flatMap((s, secIdx) => s.lines.map((l, lineIdx) => ({ secIdx, lineIdx, id: l.id }))),
    [song.sections],
  )

  const focusLine = useCallback((id: string, col: number) => {
    pendingFocus.current = { id, col }
    const el = inputs.current.get(id)
    if (el) {
      el.focus()
      el.setSelectionRange(col, col)
      pendingFocus.current = null
    }
  }, [])

  useEffect(() => {
    const p = pendingFocus.current
    if (p) {
      const el = inputs.current.get(p.id)
      if (el) {
        el.focus()
        el.setSelectionRange(p.col, p.col)
        pendingFocus.current = null
      }
    }
  })

  const registerInput = useCallback((id: string, el: HTMLInputElement | null) => {
    if (el) inputs.current.set(id, el)
    else inputs.current.delete(id)
  }, [])

  const moveFocus = useCallback(
    (lineId: string, dir: -1 | 1, col: number) => {
      const i = flatLines.findIndex(f => f.id === lineId)
      const target = flatLines[i + dir]
      if (target) focusLine(target.id, col)
    },
    [flatLines, focusLine],
  )

  // ---- mutations -----------------------------------------------------------

  const setLineText = (secIdx: number, lineIdx: number, text: string) =>
    update(
      d => {
        d.sections[secIdx].lines[lineIdx].text = text
        const len = text.length
        d.sections[secIdx].lines[lineIdx].chords = d.sections[secIdx].lines[lineIdx].chords.filter(
          c => c.position <= len,
        )
      },
      `line:${song.sections[secIdx].lines[lineIdx].id}`,
    )

  const splitLine = (secIdx: number, lineIdx: number, at: number) => {
    update(d => {
      const l = d.sections[secIdx].lines[lineIdx]
      const tail = newLine(l.text.slice(at))
      tail.chords = l.chords
        .filter(c => c.position >= at)
        .map(c => ({ ...c, position: c.position - at }))
      l.text = l.text.slice(0, at)
      l.chords = l.chords.filter(c => c.position < at)
      d.sections[secIdx].lines.splice(lineIdx + 1, 0, tail)
      pendingFocus.current = { id: tail.id, col: 0 }
    })
  }

  const mergeUp = (secIdx: number, lineIdx: number) => {
    if (secIdx === 0 && lineIdx === 0) return
    let targetSec = secIdx
    let targetLine = lineIdx - 1
    if (targetLine < 0) {
      targetSec = secIdx - 1
      targetLine = song.sections[targetSec].lines.length - 1
      if (targetLine < 0) {
        update(d => {
          d.sections.splice(secIdx, 1)
        })
        return
      }
    }
    const target = song.sections[targetSec].lines[targetLine]
    const offset = target.text.length
    update(d => {
      const t = d.sections[targetSec].lines[targetLine]
      const l = d.sections[secIdx].lines[lineIdx]
      t.chords = [...t.chords, ...l.chords.map(c => ({ ...c, position: c.position + offset }))]
      t.text += l.text
      d.sections[secIdx].lines.splice(lineIdx, 1)
      if (d.sections[secIdx].lines.length === 0 && d.sections.length > 1) {
        d.sections.splice(secIdx, 1)
      }
      pendingFocus.current = { id: t.id, col: offset }
    })
  }

  const addLine = (secIdx: number, afterIdx: number) =>
    update(d => {
      const l = newLine()
      d.sections[secIdx].lines.splice(afterIdx + 1, 0, l)
      pendingFocus.current = { id: l.id, col: 0 }
    })

  const addSection = () =>
    update(d => {
      d.sections.push(newSection('verse', `Verse ${d.sections.filter(s => s.type === 'verse').length + 1}`))
    })

  const moveSection = (secIdx: number, dir: -1 | 1) =>
    update(d => {
      const j = secIdx + dir
      if (j < 0 || j >= d.sections.length) return
      const [s] = d.sections.splice(secIdx, 1)
      d.sections.splice(j, 0, s)
    })

  const deleteSection = (secIdx: number) =>
    update(d => {
      d.sections.splice(secIdx, 1)
      if (d.sections.length === 0) d.sections.push(newSection('verse', 'Verse 1'))
    })

  const setSectionMeta = (secIdx: number, patch: Partial<Pick<Section, 'type' | 'title'>>) =>
    update(d => {
      Object.assign(d.sections[secIdx], patch)
    })

  const addChordAt = (secIdx: number, lineIdx: number, chord: Chord, pos: number) =>
    update(d => {
      const l = d.sections[secIdx].lines[lineIdx]
      l.chords = l.chords.filter(c => c.position !== pos)
      l.chords.push(placedChord(chord, Math.min(pos, l.text.length)))
      l.chords.sort((a, b) => a.position - b.position)
    })

  const replaceChord = (secIdx: number, lineIdx: number, placedId: string, chord: Chord) =>
    update(d => {
      const c = d.sections[secIdx].lines[lineIdx].chords.find(x => x.id === placedId)
      if (c) {
        c.chord = chord
        c.voicingId = undefined
      }
    })

  const deleteChord = (secIdx: number, lineIdx: number, placedId: string) =>
    update(d => {
      const l = d.sections[secIdx].lines[lineIdx]
      l.chords = l.chords.filter(c => c.id !== placedId)
    })

  const setVoicing = (secIdx: number, lineIdx: number, placedId: string, voicingId: string) =>
    update(d => {
      const c = d.sections[secIdx].lines[lineIdx].chords.find(x => x.id === placedId)
      if (c) c.voicingId = voicingId
    })

  const transpose = (semitones: number) =>
    update(d => {
      for (const s of d.sections)
        for (const l of s.lines) for (const c of l.chords) c.chord = transposeChord(c.chord, semitones)
      if (d.key) {
        const m = d.key.trim().match(/^([A-Ga-g][#b]?)(m|min)?$/)
        if (m) {
          const minor = m[2] ? 'm' : ''
          const root = m[1][0].toUpperCase() + m[1].slice(1)
          try {
            d.key = transposeNote(root as never, semitones) + minor
          } catch {
            /* keep */
          }
        }
      }
    })

  // ---- interactions --------------------------------------------------------

  const onStripClick = (secIdx: number, lineIdx: number, pos: number) => {
    setPop(null)
    if (armed) addChordAt(secIdx, lineIdx, armed, pos)
    else setPicker({ secIdx, lineIdx, pos })
  }

  const onChordClick = (secIdx: number, lineIdx: number, placedId: string, x: number, y: number) =>
    setPop({ secIdx, lineIdx, placedId, x, y })

  // ---- shortcuts -----------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) {
        if (e.key === 'Escape') setArmed(null)
        return
      }
      if (e.key === 's') {
        e.preventDefault()
        void saveSong(song)
      } else if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      } else if (e.key === 'k') {
        e.preventDefault()
        const { secIdx, lineIdx, pos } = lastCaret.current
        setPicker({ secIdx, lineIdx, pos })
      } else if (e.key === 'p') {
        e.preventDefault()
        setPreviewOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [song, undo, redo])

  const popPlaced = pop
    ? song.sections[pop.secIdx]?.lines[pop.lineIdx]?.chords.find(c => c.id === pop.placedId)
    : undefined

  return (
    <div className="flex flex-col h-full">
      {/* top bar */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-30">
        <button
          onClick={onOpenLibrary}
          className="font-display text-lg leading-none hover:text-accent transition-colors"
          aria-label="Open song library"
        >
          Tabby
        </button>
        <span className="text-faint text-xs hidden sm:inline">/ {song.title}</span>
        <span className={`text-[11px] ml-1 ${saved ? 'text-faint' : 'text-accent'}`}>
          {saved ? 'saved' : 'saving…'}
        </span>
        <div className="flex-1" />
        <AuthButton />
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-2 py-1 text-sm rounded border border-line disabled:opacity-30 hover:border-ink/40"
          title="Undo (⌘Z)"
        >
          ↺
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-2 py-1 text-sm rounded border border-line disabled:opacity-30 hover:border-ink/40"
          title="Redo (⌘⇧Z)"
        >
          ↻
        </button>
        <button
          onClick={() => void saveSong(song)}
          className="px-3 py-1.5 text-sm rounded-md border border-line hover:border-ink/40"
          title="Save (⌘S)"
        >
          Save
        </button>
        <button
          onClick={() => setPreviewOpen(true)}
          className="px-3 py-1.5 text-sm rounded-md border border-line hover:border-ink/40"
        >
          Preview
        </button>
        <button
          onClick={() => setPdfOpen(true)}
          className="px-3 py-1.5 text-sm rounded-md bg-ink text-paper hover:bg-ink/85"
        >
          Export PDF
        </button>
      </header>

      {/* metadata */}
      <div className="border-b border-line bg-surface/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-end gap-x-5 gap-y-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-faint">Title</span>
            <input
              value={song.title}
              onChange={e => update(d => void (d.title = e.target.value), 'meta:title')}
              className="font-display text-2xl bg-transparent border-b border-transparent hover:border-line focus:border-accent w-56"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-faint">Artist</span>
            <input
              value={song.artist ?? ''}
              onChange={e => update(d => void (d.artist = e.target.value), 'meta:artist')}
              placeholder="—"
              className="bg-transparent border-b border-transparent hover:border-line focus:border-accent w-36 text-sm"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-faint">Key</span>
            <input
              value={song.key ?? ''}
              onChange={e => update(d => void (d.key = e.target.value), 'meta:key')}
              placeholder="—"
              className="bg-transparent border-b border-transparent hover:border-line focus:border-accent w-14 text-sm font-mono"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-faint">BPM</span>
            <input
              value={song.bpm ?? ''}
              onChange={e =>
                update(d => void (d.bpm = e.target.value ? parseInt(e.target.value, 10) : undefined), 'meta:bpm')
              }
              placeholder="—"
              inputMode="numeric"
              className="bg-transparent border-b border-transparent hover:border-line focus:border-accent w-14 text-sm font-mono"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-faint">Tuning</span>
            <select
              value={song.tuningId}
              onChange={e => update(d => void (d.tuningId = e.target.value))}
              className="bg-transparent border-b border-line text-sm py-0.5"
            >
              {BUILTIN_TUNINGS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.strings.join(' ')})
                </option>
              ))}
              {song.customTunings.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-faint">Capo</span>
            <select
              value={song.capo}
              onChange={e => update(d => void (d.capo = parseInt(e.target.value, 10)))}
              className="bg-transparent border-b border-line text-sm py-0.5 font-mono"
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <div className="relative">
            <button
              onClick={() => setTransposeOpen(v => !v)}
              className="px-3 py-1 text-sm rounded border border-line hover:border-ink/40"
              aria-expanded={transposeOpen}
            >
              Transpose
            </button>
            {transposeOpen && (
              <div className="fade-up absolute top-8 left-0 z-40 bg-surface border border-line rounded-lg shadow-xl p-2">
                <div className="grid grid-cols-7 gap-1 w-max">
                  {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      disabled={n === 0}
                      onClick={() => {
                        transpose(n)
                        setTransposeOpen(false)
                      }}
                      className="w-8 h-8 text-xs font-mono rounded border border-line hover:bg-chord hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
                    >
                      {n > 0 ? `+${n}` : n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setMetaOpen(v => !v)}
            className="text-xs text-faint hover:text-ink underline underline-offset-2"
          >
            {metaOpen ? 'hide notes' : 'notes'}
          </button>
        </div>
        {metaOpen && (
          <div className="max-w-5xl mx-auto pt-2">
            <textarea
              value={song.notes ?? ''}
              onChange={e => update(d => void (d.notes = e.target.value), 'meta:notes')}
              placeholder="Performance notes, strumming pattern, etc."
              rows={2}
              className="w-full bg-paper/70 border border-line rounded-md px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* sections */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {song.sections.map((section, secIdx) => (
            <section key={section.id} className="fade-up">
              <SectionHeader
                section={section}
                index={secIdx}
                count={song.sections.length}
                types={SECTION_TYPES}
                onMeta={patch => setSectionMeta(secIdx, patch)}
                onMove={dir => moveSection(secIdx, dir)}
                onDelete={() => deleteSection(secIdx)}
              />
              <div className="pl-1 sm:pl-4">
                {section.lines.map((line, lineIdx) => (
                  <LyricLineEditor
                    key={line.id}
                    line={line}
                    armed={armed}
                    onText={t => setLineText(secIdx, lineIdx, t)}
                    onSplit={at => splitLine(secIdx, lineIdx, at)}
                    onMergeUp={() => mergeUp(secIdx, lineIdx)}
                    onMoveFocus={(dir, col) => moveFocus(line.id, dir, col)}
                    onStripClick={pos => onStripClick(secIdx, lineIdx, pos)}
                    onChordClick={(pid, x, y) => onChordClick(secIdx, lineIdx, pid, x, y)}
                    onCaret={pos => {
                      lastCaret.current = { secIdx, lineIdx, pos }
                    }}
                    registerInput={registerInput}
                  />
                ))}
                <button
                  onClick={() => addLine(secIdx, section.lines.length - 1)}
                  className="text-xs text-faint hover:text-accent mt-1"
                >
                  + add line
                </button>
              </div>
            </section>
          ))}
          <button
            onClick={addSection}
            className="w-full py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft hover:border-accent hover:text-accent transition-colors"
          >
            + Add section
          </button>
          <p className="text-[11px] text-faint pb-24 sm:pb-8">
            Click the space above a line to place a chord. Pick one from the palette below to place
            several quickly — Esc to stop. ⌘K opens the picker, ⌘Z undoes.
          </p>
        </div>
      </main>

      {/* chord palette */}
      <footer className="border-t border-line bg-surface/90 backdrop-blur sticky bottom-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-widest text-faint shrink-0 pr-1">Chords</span>
          {PALETTE.map(c => {
            const name = chordDisplayName(c)
            const isArmed = armed && chordDisplayName(armed) === name
            return (
              <button
                key={name}
                onClick={() => setArmed(isArmed ? null : c)}
                className={`px-2.5 py-1 rounded font-mono text-sm border shrink-0 transition-colors ${
                  isArmed
                    ? 'bg-accent text-white border-accent'
                    : 'border-line text-chord hover:border-chord/60'
                }`}
              >
                {name}
              </button>
            )
          })}
          <button
            onClick={() => setPicker({ ...lastCaret.current })}
            className="px-2.5 py-1 rounded font-mono text-sm border border-dashed border-line text-faint hover:text-ink shrink-0"
            title="All chords (⌘K)"
          >
            ⋯
          </button>
        </div>
      </footer>

      {/* overlays */}
      {picker && (
        <ChordPicker
          tuning={tuning}
          initial={picker.initial}
          onPick={chord => {
            if (picker.replaceId) replaceChord(picker.secIdx, picker.lineIdx, picker.replaceId, chord)
            else addChordAt(picker.secIdx, picker.lineIdx, chord, picker.pos)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {pop && popPlaced && (
        <ChordPopover
          placed={popPlaced}
          tuning={tuning}
          capo={song.capo}
          anchor={{ x: pop.x, y: pop.y }}
          onSelectVoicing={id => {
            setVoicing(pop.secIdx, pop.lineIdx, pop.placedId, id)
            setPop(null)
          }}
          onEditChord={chord => {
            setPop(null)
            setPicker({ ...pop, pos: 0, replaceId: pop.placedId, initial: chord })
          }}
          onDelete={() => {
            deleteChord(pop.secIdx, pop.lineIdx, pop.placedId)
            setPop(null)
          }}
          onClose={() => setPop(null)}
        />
      )}
      {previewOpen && <SongPreview onClose={() => setPreviewOpen(false)} />}
      {pdfOpen && <PdfExportDialog onClose={() => setPdfOpen(false)} />}
    </div>
  )
}
