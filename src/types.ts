export type NoteName =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb'
  | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B'

export type ChordQuality =
  | 'maj' | 'm' | '7' | 'maj7' | 'm7' | 'm7b5' | 'dim' | 'dim7' | 'aug'
  | 'sus2' | 'sus4' | '6' | 'm6' | '9' | 'm9' | 'maj9' | 'add9' | '5' | '7sus4'

export type Chord = {
  root: NoteName
  quality: ChordQuality
  bass?: NoteName
}

export type Tuning = {
  id: string
  name: string
  strings: NoteName[] // low to high: string 6 → string 1
  builtin?: boolean
}

export type FretMark = number | 'x' // 'x' = muted

export type ChordVoicing = {
  id: string
  name?: string
  frets: FretMark[] // index 0 = lowest string (string 6)
  fingers?: (number | null)[]
  baseFret: number // fret shown at top of diagram
  barres?: { fret: number; fromString: number; toString: number }[]
  tuningId: string
  generated?: boolean
}

export type PlacedChord = {
  id: string
  chord: Chord
  position: number
  voicingId?: string
}

export type LyricLine = {
  id: string
  text: string
  chords: PlacedChord[]
}

export type SectionType =
  | 'intro' | 'verse' | 'chorus' | 'prechorus' | 'bridge' | 'outro'
  | 'instrumental' | 'custom'

export type Section = {
  id: string
  type: SectionType
  title?: string
  lines: LyricLine[]
}

export type Song = {
  id: string
  title: string
  artist?: string
  key?: string
  bpm?: number
  tuningId: string
  capo: number
  sections: Section[]
  customVoicings: ChordVoicing[]
  customTunings: Tuning[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type PdfOptions = {
  showChordDiagrams: boolean
  showTuning: boolean
  showCapo: boolean
  showNotes: boolean
  fontSize: 'small' | 'medium' | 'large'
  layout: 'compact' | 'standard' | 'large'
}
