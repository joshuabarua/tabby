import { describe, expect, it } from 'vitest'
import type { Section } from '../types'
import { cloneSection, copySectionChords, newLine, newSection, placedChord } from './song'

function sourceVerse() {
  const section = newSection('verse', 'Verse 1')
  const first = placedChord({ root: 'G', quality: 'maj', bass: 'B' }, 0)
  first.voicingId = 'g-shape'
  section.lines = [
    { ...newLine('Long first lyric'), chords: [first, placedChord({ root: 'D', quality: '7' }, 12)] },
    newLine('Second lyric'),
  ]
  return section
}

describe('section copying', () => {
  it('duplicates all content with independent section, line and chord IDs', () => {
    const source = sourceVerse()
    const copy = cloneSection(source)
    expect(copy.id).not.toBe(source.id)
    expect(copy.type).toBe(source.type)
    expect(copy.title).toBe(source.title)
    copy.lines.forEach((line, index) => {
      expect(line.id).not.toBe(source.lines[index].id)
      expect(line.text).toBe(source.lines[index].text)
      line.chords.forEach((chord, chordIndex) => {
        const original = source.lines[index].chords[chordIndex]
        expect(chord.id).not.toBe(original.id)
        expect(chord.chord).toEqual(original.chord)
        expect(chord.chord).not.toBe(original.chord)
        expect(chord.position).toBe(original.position)
        expect(chord.voicingId).toBe(original.voicingId)
      })
    })
  })

  it('replaces matching line chords without changing target lyrics or IDs', () => {
    const source = sourceVerse()
    const target = newSection('verse', 'Verse 2')
    target.lines = [newLine('Different lyrics here'), newLine('Other lyrics')]
    target.lines[0].chords = [placedChord({ root: 'C', quality: 'maj' }, 2)]
    target.lines[1].chords = [placedChord({ root: 'A', quality: 'm' }, 0)]
    const before = structuredClone(target)
    copySectionChords(source, target)
    expect(target.id).toBe(before.id)
    expect(target.title).toBe(before.title)
    target.lines.forEach((line, index) => {
      expect(line.id).toBe(before.lines[index].id)
      expect(line.text).toBe(before.lines[index].text)
    })
    expect(target.lines[0].chords.map(c => c.position)).toEqual([0, 18])
    expect(target.lines[0].chords[0].voicingId).toBe('g-shape')
    expect(target.lines[0].chords[0].id).not.toBe(source.lines[0].chords[0].id)
    expect(target.lines[0].chords[0].chord).not.toBe(source.lines[0].chords[0].chord)
    expect(target.lines[1].chords).toEqual([])
  })

  it('skips word anchors on a wordless target and leaves extra lines untouched', () => {
    const source = sourceVerse()
    const original = structuredClone(source)
    const target = newSection('verse')
    const extra = { ...newLine('Extra line'), chords: [placedChord({ root: 'E', quality: 'm' }, 0)] }
    target.lines = [newLine(''), newLine('Short'), extra]
    copySectionChords(source, target)
    expect(target.lines[0].chords).toEqual([])
    expect(target.lines[2]).toEqual(extra)
    expect(source).toEqual(original)
  })

  it('does not add lines when the target has fewer lines', () => {
    const target = newSection('verse')
    copySectionChords(sourceVerse(), target)
    expect(target.lines).toHaveLength(1)
  })
})

describe('word-aligned chord copying', () => {
  const verse = (lines: { text: string; positions: number[] }[]) => {
    const section = newSection('verse')
    section.lines = lines.map(l => ({
      ...newLine(l.text),
      chords: l.positions.map(p => placedChord({ root: 'G', quality: 'maj' }, p)),
    }))
    return section
  }

  const positions = (section: Section, lineIdx = 0) =>
    section.lines[lineIdx].chords.map(c => c.position)

  it('anchors by word ordinal across different word lengths', () => {
    const source = verse([{ text: 'aaaa bb cccc', positions: [0, 5, 8] }])
    const target = verse([{ text: 'x yyyyyy zz', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([0, 2, 9])
  })

  it('handles leading whitespace, tabs and runs of spaces', () => {
    const source = verse([{ text: '  One\t\ttwo   three  ', positions: [0, 6, 14] }])
    const target = verse([{ text: 'A B C', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([0, 2, 4])
  })

  it('maps repeated words by ordinal, not by text', () => {
    const source = verse([{ text: 'la la la', positions: [0, 3, 6] }])
    const target = verse([{ text: 'one two three', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([0, 4, 8])
  })

  it('skips chords whose ordinal word is missing in the target', () => {
    const source = verse([{ text: 'one two three four', positions: [0, 13] }])
    const target = verse([{ text: 'only two words', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([0])
  })

  it('clamps mid-word offsets to the target word last character', () => {
    const source = verse([{ text: 'loooooong x', positions: [8, 10] }])
    const target = verse([{ text: 'hi there', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([1, 3])
  })

  it('maps whitespace before a word to that word start', () => {
    const source = verse([{ text: 'one  two', positions: [4] }])
    const target = verse([{ text: 'a b', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([2])
  })

  it('maps end-of-line and trailing whitespace to the target end', () => {
    const source = verse([{ text: 'abc def   ', positions: [7, 9] }])
    const target = verse([{ text: 'x yz', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([4])
  })

  it('keeps absolute anchors only when a wordless source fits the target', () => {
    const source = verse([
      { text: '     ', positions: [3, 9] },
      { text: 'ab', positions: [99] },
    ])
    const target = verse([
      { text: 'hi', positions: [] },
      { text: 'whatever', positions: [] },
    ])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([])
    expect(positions(target, 1)).toEqual([])
    const roomy = verse([
      { text: 'hello world', positions: [] },
      { text: 'more words here', positions: [] },
    ])
    copySectionChords(source, roomy)
    expect(positions(roomy)).toEqual([3])
    expect(positions(roomy, 1)).toEqual([])
  })

  it('keeps the first chord when anchors collide', () => {
    const source = newSection('verse')
    source.lines = [
      {
        ...newLine('aa bb'),
        chords: [
          placedChord({ root: 'G', quality: 'maj' }, 0),
          placedChord({ root: 'C', quality: 'maj' }, 1),
        ],
      },
    ]
    const target = verse([{ text: 'z yy', positions: [] }])
    copySectionChords(source, target)
    expect(positions(target)).toEqual([0])
    expect(target.lines[0].chords[0].chord.root).toBe('G')
  })
})
