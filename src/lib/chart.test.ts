import { describe, expect, it } from 'vitest'
import { parseChordChart, parseChordLine, songFromChart } from './chart'
import { chordDisplayName } from './music'
import { validateSong } from './song'
import type { LyricLine } from '../types'

const chords = (l: LyricLine) => l.chords.map(c => [chordDisplayName(c.chord), c.position])

describe('parseChordLine', () => {
  it('recognises chord-only lines with filler', () => {
    expect(parseChordLine('G   C/B  | Am7  (D)  x2')?.map(c => c.position)).toEqual([0, 4, 11, 17])
  })
  it('rejects lyric lines', () => {
    expect(parseChordLine('A little bit of love')).toBeNull()
  })
})

describe('parseChordChart', () => {
  it('places chords above the right letters and reads metadata and headers', () => {
    const chart = parseChordChart(
      [
        'Title: Test Song',
        'Artist: Someone',
        'Key: G',
        'Capo: 2',
        '',
        '[Verse 1]',
        'G       C',
        'Hello there friend',
        '',
        'Chorus:',
        'D',
        'Sing',
      ].join('\n'),
    )
    expect(chart.title).toBe('Test Song')
    expect(chart.artist).toBe('Someone')
    expect(chart.key).toBe('G')
    expect(chart.capo).toBe(2)
    expect(chart.sections.map(s => [s.type, s.title])).toEqual([
      ['verse', 'Verse 1'],
      ['chorus', 'Chorus'],
    ])
    const line = chart.sections[0].lines[0]
    expect(line.text).toBe('Hello there friend')
    expect(chords(line)).toEqual([['G', 0], ['C', 8]])
  })

  it('handles inline ChordPro chords and directives', () => {
    const chart = parseChordChart('{title: Pro}\n{start_of_chorus}\n[C]Inline [G]chords\n{end_of_chorus}')
    expect(chart.title).toBe('Pro')
    expect(chart.sections[0].type).toBe('chorus')
    const line = chart.sections[0].lines[0]
    expect(line.text).toBe('Inline chords')
    expect(chords(line)).toEqual([['C', 0], ['G', 7]])
  })

  it('keeps chord-only lines as instrumental lines, padding text to fit', () => {
    const chart = parseChordChart('Intro: G  D  Em  C')
    expect(chart.sections[0].type).toBe('intro')
    const line = chart.sections[0].lines[0]
    expect(chords(line).map(c => c[0])).toEqual(['G', 'D', 'Em', 'C'])
    expect(line.text.length).toBeGreaterThanOrEqual(line.chords.at(-1)!.position)
  })

  it('pads short lyrics so chords past the end stay valid', () => {
    const line = parseChordChart('G        D\nHi').sections[0].lines[0]
    expect(line.text.length).toBe(9)
    expect(chords(line)).toEqual([['G', 0], ['D', 9]])
  })

  it('splits untitled stanzas on blank lines and numbers them', () => {
    const chart = parseChordChart('one\ntwo\n\nthree')
    expect(chart.sections.map(s => s.title)).toEqual(['Verse 1', 'Verse 2'])
  })

  it('does not treat lyrics starting with a section word as headers', () => {
    const chart = parseChordChart('Chorus girls sing all night')
    expect(chart.sections[0].lines[0].text).toBe('Chorus girls sing all night')
  })

  it('expands tabs so columns line up', () => {
    const line = parseChordChart('\tG\n\tHello').sections[0].lines[0]
    expect(chords(line)).toEqual([['G', 8]])
  })
})

describe('songFromChart', () => {
  it('produces a valid song', () => {
    const { song } = songFromChart('[Verse]\nG   C\nwords go here')
    expect(song).toBeTruthy()
    expect(validateSong(JSON.parse(JSON.stringify(song))).song).toBeTruthy()
  })
  it('errors on empty input', () => {
    expect(songFromChart('  \n ').error).toBeTruthy()
  })
})
