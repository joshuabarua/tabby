import type { Chord, ChordQuality, NoteName } from '../types'

export const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

export const ALL_NOTE_NAMES = Object.keys(NOTE_TO_SEMITONE) as NoteName[]

export function noteToSemitone(n: NoteName): number {
  return NOTE_TO_SEMITONE[n]
}

export function semitoneToNote(semi: number, preferFlats = false): NoteName {
  const idx = ((semi % 12) + 12) % 12
  return (preferFlats ? FLAT_NOTES[idx] : SHARP_NOTES[idx]) as NoteName
}

export function transposeNote(n: NoteName, semitones: number): NoteName {
  const preferFlats = n.includes('b')
  return semitoneToNote(noteToSemitone(n) + semitones, preferFlats)
}

const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '9': [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14],
  '5': [0, 7],
  '7sus4': [0, 5, 7, 10],
}

const QUALITY_LABELS: Record<ChordQuality, string> = {
  maj: 'Major', m: 'Minor', '7': 'Dominant 7', maj7: 'Major 7', m7: 'Minor 7',
  m7b5: 'Half-diminished', dim: 'Diminished', dim7: 'Diminished 7', aug: 'Augmented',
  sus2: 'Suspended 2', sus4: 'Suspended 4', '6': '6', m6: 'Minor 6',
  '9': '9', m9: 'Minor 9', maj9: 'Major 9', add9: 'Add 9', '5': 'Power chord',
  '7sus4': '7 suspended 4',
}

const QUALITY_DISPLAY: Record<ChordQuality, string> = {
  maj: '', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7', m7b5: 'm7♭5', dim: 'dim',
  dim7: 'dim7', aug: 'aug', sus2: 'sus2', sus4: 'sus4', '6': '6', m6: 'm6',
  '9': '9', m9: 'm9', maj9: 'maj9', add9: 'add9', '5': '5', '7sus4': '7sus4',
}

export const CHORD_QUALITIES = Object.keys(QUALITY_INTERVALS) as ChordQuality[]

export function chordDisplayName(chord: Chord): string {
  const base = chord.root + QUALITY_DISPLAY[chord.quality]
  return chord.bass ? `${base}/${chord.bass}` : base
}

export function chordQualityLabel(quality: ChordQuality): string {
  return QUALITY_LABELS[quality]
}

export function chordDescription(chord: Chord): string {
  const label = QUALITY_LABELS[chord.quality]
  return chord.quality === 'maj'
    ? `${chord.root} major`
    : `${chord.root} ${label.charAt(0).toLowerCase()}${label.slice(1)}`
}

export function chordTones(chord: Chord): NoteName[] {
  const rootSemi = noteToSemitone(chord.root)
  const preferFlats = chord.root.includes('b')
  const tones = QUALITY_INTERVALS[chord.quality].map(i =>
    semitoneToNote(rootSemi + i, preferFlats),
  )
  return [...new Set(tones)]
}

export function chordToneSemitones(chord: Chord): Set<number> {
  const rootSemi = noteToSemitone(chord.root)
  return new Set(QUALITY_INTERVALS[chord.quality].map(i => (rootSemi + i) % 12))
}

export function transposeChord(chord: Chord, semitones: number): Chord {
  const preferFlats = chord.root.includes('b')
  return {
    root: semitoneToNote(noteToSemitone(chord.root) + semitones, preferFlats),
    quality: chord.quality,
    bass: chord.bass
      ? semitoneToNote(noteToSemitone(chord.bass) + semitones, preferFlats)
      : undefined,
  }
}

export function soundingChord(written: Chord, capo: number): Chord {
  return transposeChord(written, capo)
}

const QUALITY_ALIASES: Record<string, ChordQuality> = {
  '': 'maj', maj: 'maj', ma: 'maj', M: 'maj', major: 'maj',
  m: 'm', min: 'm', minor: 'm', '-': 'm',
  '7': '7',
  maj7: 'maj7', ma7: 'maj7', M7: 'maj7', 'Δ7': 'maj7', 'Δ': 'maj7',
  m7: 'm7', min7: 'm7', '-7': 'm7',
  maj9: 'maj9', ma9: 'maj9', M9: 'maj9', 'Δ9': 'maj9',
  m9: 'm9', min9: 'm9', '-9': 'm9',
  m7b5: 'm7b5', 'm7♭5': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', halfdim: 'm7b5',
  '7sus4': '7sus4', '7sus': '7sus4',
  sus2: 'sus2', sus9: 'sus2',
  sus4: 'sus4', sus: 'sus4',
  add9: 'add9', add2: 'add9',
  dim7: 'dim7', '°7': 'dim7', o7: 'dim7',
  dim: 'dim', '°': 'dim', o: 'dim',
  aug: 'aug', '+': 'aug', '#5': 'aug',
  '9': '9', '6': '6', m6: 'm6', min6: 'm6', '-6': 'm6', '5': '5',
}

export function parseChord(input: string): Chord | null {
  const s = input.trim()
  if (!s) return null
  const m = s.match(/^([A-Ga-g])([#b♯♭]?)(.*)$/)
  if (!m) return null
  const rootStr = (m[1].toUpperCase() + m[2].replace('♯', '#').replace('♭', 'b')) as NoteName
  if (!(rootStr in NOTE_TO_SEMITONE)) return null
  let rest = m[3]
  let bass: NoteName | undefined
  const slash = rest.match(/^(.*)\/([A-Ga-g])([#b♯♭]?)$/)
  if (slash) {
    rest = slash[1]
    const b = (slash[2].toUpperCase() + slash[3].replace('♯', '#').replace('♭', 'b')) as NoteName
    if (!(b in NOTE_TO_SEMITONE)) return null
    bass = b
  }
  const quality = QUALITY_ALIASES[rest]
  if (quality === undefined) return null
  return { root: rootStr, quality, bass }
}

export function chordKey(chord: Chord): string {
  return `${chord.root}:${chord.quality}${chord.bass ? ':' + chord.bass : ''}`
}
