import { describe, it, expect } from 'vitest'
import { parseChord, transposeChord, chordDisplayName, chordTones, semitoneToNote } from './music'
import { chordLineText } from './layout'
import { voicingsFor } from './voicings'
import { BUILTIN_TUNINGS, getTuning } from './tunings'
import { chordToneSemitones, noteToSemitone } from './music'

describe('parseChord', () => {
  it('parses simple chords', () => {
    expect(parseChord('G')).toEqual({ root: 'G', quality: 'maj', bass: undefined })
    expect(parseChord('Am')).toEqual({ root: 'A', quality: 'm', bass: undefined })
    expect(parseChord('Gmaj7')).toMatchObject({ root: 'G', quality: 'maj7' })
    expect(parseChord('Bb')).toMatchObject({ root: 'Bb', quality: 'maj' })
    expect(parseChord('F#m7')).toMatchObject({ root: 'F#', quality: 'm7' })
  })
  it('parses slash chords', () => {
    expect(parseChord('G/B')).toEqual({ root: 'G', quality: 'maj', bass: 'B' })
    expect(parseChord('D/F#')).toMatchObject({ bass: 'F#' })
  })
  it('rejects junk', () => {
    expect(parseChord('hello')).toBeNull()
    expect(parseChord('')).toBeNull()
    expect(parseChord('H')).toBeNull()
  })
})

describe('transposeChord', () => {
  it('transposes preserving quality', () => {
    expect(chordDisplayName(transposeChord(parseChord('C')!, 2))).toBe('D')
    expect(chordDisplayName(transposeChord(parseChord('Am')!, 2))).toBe('Bm')
    expect(chordDisplayName(transposeChord(parseChord('G7')!, 2))).toBe('A7')
    expect(chordDisplayName(transposeChord(parseChord('Gmaj7')!, 2))).toBe('Amaj7')
  })
  it('transposes slash chords', () => {
    expect(chordDisplayName(transposeChord(parseChord('G/B')!, 2))).toBe('A/C#')
  })
  it('wraps around', () => {
    expect(chordDisplayName(transposeChord(parseChord('B')!, 2))).toBe('C#')
    expect(chordDisplayName(transposeChord(parseChord('C')!, -1))).toBe('B')
  })
})

describe('chordLineText', () => {
  it('places chords at char positions', () => {
    const line = {
      id: 'l1',
      text: 'I was walking down the street today',
      chords: [
        { id: 'a', chord: parseChord('C')!, position: 8 },
        { id: 'b', chord: parseChord('Am')!, position: 25 },
      ],
    }
    const cl = chordLineText(line)
    expect(cl.indexOf('C')).toBe(8)
    expect(cl.indexOf('Am')).toBe(25)
  })
  it('handles overlaps by shifting', () => {
    const line = {
      id: 'l1',
      text: 'abcdefghij',
      chords: [
        { id: 'a', chord: parseChord('Cmaj7')!, position: 0 },
        { id: 'b', chord: parseChord('D')!, position: 2 },
      ],
    }
    const cl = chordLineText(line)
    expect(cl.indexOf('D')).toBe(5)
  })
})

describe('voicings', () => {
  it('returns curated voicing for standard G', () => {
    const vs = voicingsFor(parseChord('G')!, getTuning('standard'))
    expect(vs.length).toBeGreaterThan(0)
    expect(vs[0].frets.join(',')).toBe('3,2,0,0,0,3')
  })
  it('generates voicings for non-standard tunings', () => {
    for (const t of BUILTIN_TUNINGS) {
      const vs = voicingsFor(parseChord('G')!, t)
      expect(vs.length).toBeGreaterThan(0)
      expect(vs.every(v => v.tuningId === t.id)).toBe(true)
    }
  })
  it('generated voicings only contain chord tones', () => {
    const tuning = getTuning('dadgad')
    const chord = parseChord('D')!
    const vs = voicingsFor(chord, tuning)
    const tones = chordToneSemitones(chord)
    for (const v of vs) {
      v.frets.forEach((f, i) => {
        if (f !== 'x') {
          expect(tones.has((noteToSemitone(tuning.strings[i]) + f) % 12)).toBe(true)
        }
      })
    }
  })
  it('always includes the root', () => {
    for (const name of ['C', 'E', 'Bb', 'F#m', 'Cmaj7']) {
      const chord = parseChord(name)!
      for (const v of voicingsFor(chord, getTuning('standard'))) {
        const present = new Set<number>()
        v.frets.forEach((f, i) => {
          if (f !== 'x')
            present.add((noteToSemitone(getTuning('standard').strings[i]) + f) % 12)
        })
        expect(present.has(noteToSemitone(chord.root))).toBe(true)
      }
    }
  })
})

describe('notes', () => {
  it('semitone round trips', () => {
    expect(semitoneToNote(0)).toBe('C')
    expect(semitoneToNote(-1)).toBe('B')
    expect(semitoneToNote(13)).toBe('C#')
  })
  it('chord tones', () => {
    expect(chordTones(parseChord('C')!)).toEqual(['C', 'E', 'G'])
    expect(chordTones(parseChord('Am7')!)).toEqual(['A', 'C', 'E', 'G'])
  })
})
