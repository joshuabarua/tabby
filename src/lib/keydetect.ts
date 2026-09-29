import type { ChordQuality, Song } from '../types'
import { noteToSemitone, semitoneToNote } from './music'

type Family = 'maj' | 'min' | 'dim' | 'other'

const QUALITY_FAMILY: Record<ChordQuality, Family> = {
  maj: 'maj', maj7: 'maj', maj9: 'maj', '6': 'maj', add9: 'maj', aug: 'other',
  '7': 'maj', '7sus4': 'maj',
  m: 'min', m7: 'min', m6: 'min', m9: 'min',
  dim: 'dim', dim7: 'dim', m7b5: 'dim',
  sus2: 'other', sus4: 'other', '9': 'maj', '5': 'other',
}

// semitone offset -> expected chord family, for each mode
const MAJOR_SCALE: [number, Family][] = [
  [0, 'maj'], [2, 'min'], [4, 'min'], [5, 'maj'], [7, 'maj'], [9, 'min'], [11, 'dim'],
]
const MINOR_SCALE: [number, Family][] = [
  [0, 'min'], [2, 'dim'], [3, 'maj'], [5, 'min'], [7, 'min'], [7, 'maj'], [8, 'maj'], [10, 'maj'],
]

export function detectKey(song: Song): string | null {
  const chords = song.sections.flatMap(s => s.lines.flatMap(l => l.chords.map(c => c.chord)))
  if (chords.length === 0) return null

  let bestScore = -Infinity
  let bestKey = ''

  for (let tonic = 0; tonic < 12; tonic++) {
    for (const [mode, scale] of [
      ['maj', MAJOR_SCALE],
      ['min', MINOR_SCALE],
    ] as const) {
      const table = new Map<number, Family[]>()
      for (const [off, fam] of scale) {
        table.set(off, [...(table.get(off) ?? []), fam])
      }

      let score = 0
      chords.forEach((c, i) => {
        const off = (((noteToSemitone(c.root) - tonic) % 12) + 12) % 12
        const fams = table.get(off)
        const fam = QUALITY_FAMILY[c.quality]
        const isEdge = i === 0 || i === chords.length - 1
        if (!fams) {
          score -= 1.5
        } else if (fams.includes(fam)) {
          score += 2
        } else {
          score += 1
        }
        if (isEdge && off === 0 && fam === (mode === 'maj' ? 'maj' : 'min')) score += 3
        else if (isEdge && off === 0) score += 1
      })
      if (mode === 'min') score -= 0.5 // slight preference for major on ties

      if (score > bestScore) {
        bestScore = score
        bestKey = semitoneToNote(tonic) + (mode === 'min' ? 'm' : '')
      }
    }
  }
  return bestKey
}
