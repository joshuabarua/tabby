import { z } from 'zod'
import type { LyricLine, PlacedChord, Section, Song } from '../types'
import { uid } from './id'

const noteSchema = z.enum([
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb',
  'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
])

const chordSchema = z.object({
  root: noteSchema,
  quality: z.enum([
    'maj', 'm', '7', 'maj7', 'm7', 'm7b5', 'dim', 'dim7', 'aug',
    'sus2', 'sus4', '6', 'm6', '9', 'm9', 'maj9', 'add9', '5', '7sus4',
  ]),
  bass: noteSchema.optional(),
})

const voicingSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  frets: z.array(z.union([z.number().int().min(0).max(24), z.literal('x')])).length(6),
  fingers: z.array(z.number().nullable()).length(6).optional(),
  baseFret: z.number().int().min(0),
  barres: z
    .array(z.object({ fret: z.number(), fromString: z.number(), toString: z.number() }))
    .optional(),
  tuningId: z.string(),
  generated: z.boolean().optional(),
})

const tuningSchema = z.object({
  id: z.string(),
  name: z.string(),
  strings: z.array(noteSchema).length(6),
  builtin: z.boolean().optional(),
})

const lineSchema = z.object({
  id: z.string(),
  text: z.string(),
  chords: z.array(
    z.object({
      id: z.string(),
      chord: chordSchema,
      position: z.number().int().min(0),
      voicingId: z.string().optional(),
    }),
  ),
})

const sectionSchema = z.object({
  id: z.string(),
  type: z.enum(['intro', 'verse', 'chorus', 'prechorus', 'bridge', 'outro', 'instrumental', 'custom']),
  title: z.string().optional(),
  lines: z.array(lineSchema),
})

export const songSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  artist: z.string().optional(),
  key: z.string().optional(),
  bpm: z.number().optional(),
  tuningId: z.string(),
  capo: z.number().int().min(0).max(12),
  sections: z.array(sectionSchema),
  customVoicings: z.array(voicingSchema),
  customTunings: z.array(tuningSchema),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export function validateSong(data: unknown): { song?: Song; error?: string } {
  const res = songSchema.safeParse(data)
  if (!res.success) return { error: res.error.issues[0]?.message ?? 'Invalid song file' }
  const song = res.data as Song
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const c of line.chords) {
        if (c.position > line.text.length) {
          return { error: `Chord position out of range in line "${line.text.slice(0, 20)}…"` }
        }
      }
    }
  }
  return { song }
}

export function newLine(text = ''): LyricLine {
  return { id: uid(), text, chords: [] }
}

export function newSection(type: Section['type'] = 'verse', title?: string): Section {
  return { id: uid(), type, title, lines: [newLine()] }
}

export function newSong(title = 'Untitled Song'): Song {
  const now = new Date().toISOString()
  return {
    id: uid(),
    title,
    tuningId: 'standard',
    capo: 0,
    sections: [newSection('verse', 'Verse 1')],
    customVoicings: [],
    customTunings: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function exportSongJson(song: Song): void {
  const blob = new Blob([JSON.stringify(song, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${song.title.replace(/[^\w\- ]+/g, '').trim() || 'song'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function cloneSection(section: Section, title?: string): Section {
  return {
    id: uid(),
    type: section.type,
    title: title ?? section.title,
    lines: section.lines.map(l => ({
      id: uid(),
      text: l.text,
      chords: cloneChords(l.chords),
    })),
  }
}

function cloneChords(chords: PlacedChord[]): PlacedChord[] {
  return chords.map(c => ({ ...c, id: uid(), chord: { ...c.chord } }))
}

type WordSpan = { start: number; end: number }

function wordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = []
  for (const m of text.matchAll(/\S+/g)) {
    spans.push({ start: m.index, end: m.index + m[0].length })
  }
  return spans
}

function wordIndexAt(spans: WordSpan[], position: number): number {
  let lo = 0
  let hi = spans.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (spans[mid].end > position) hi = mid
    else lo = mid + 1
  }
  return lo
}

function mapPosition(
  position: number,
  sourceText: string,
  sourceSpans: WordSpan[],
  targetText: string,
  targetSpans: WordSpan[],
): number | undefined {
  if (position > sourceText.length) return undefined
  if (sourceSpans.length === 0) return position <= targetText.length ? position : undefined
  const i = wordIndexAt(sourceSpans, position)
  if (i === sourceSpans.length) return targetText.length
  const target = targetSpans[i]
  if (!target) return undefined
  const source = sourceSpans[i]
  if (position < source.start) return target.start
  return target.start + Math.min(position - source.start, target.end - target.start - 1)
}

export function copySectionChords(source: Section, target: Section): void {
  target.lines.forEach((line, index) => {
    const sourceLine = source.lines[index]
    if (!sourceLine) return
    const sourceSpans = wordSpans(sourceLine.text)
    const targetSpans = wordSpans(line.text)
    const used = new Set<number>()
    const mapped: PlacedChord[] = []
    cloneChords(sourceLine.chords).forEach((cloned, i) => {
      const position = mapPosition(
        sourceLine.chords[i].position,
        sourceLine.text,
        sourceSpans,
        line.text,
        targetSpans,
      )
      if (position === undefined || used.has(position)) return
      used.add(position)
      mapped.push({ ...cloned, position })
    })
    mapped.sort((a, b) => a.position - b.position)
    line.chords = mapped
  })
}

export function placedChord(chord: PlacedChord['chord'], position: number): PlacedChord {
  return { id: uid(), chord, position }
}
