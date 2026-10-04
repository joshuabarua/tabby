import { describe, expect, it } from 'vitest'
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
    expect(target.lines[0].chords.map(c => c.position)).toEqual([0, 12])
    expect(target.lines[0].chords[0].voicingId).toBe('g-shape')
    expect(target.lines[0].chords[0].id).not.toBe(source.lines[0].chords[0].id)
    expect(target.lines[0].chords[0].chord).not.toBe(source.lines[0].chords[0].chord)
    expect(target.lines[1].chords).toEqual([])
  })

  it('skips out-of-range chords and leaves extra target lines untouched', () => {
    const source = sourceVerse()
    const original = structuredClone(source)
    const target = newSection('verse')
    const extra = { ...newLine('Extra line'), chords: [placedChord({ root: 'E', quality: 'm' }, 0)] }
    target.lines = [newLine(''), newLine('Short'), extra]
    copySectionChords(source, target)
    expect(target.lines[0].chords.map(c => c.position)).toEqual([0])
    expect(target.lines[2]).toEqual(extra)
    expect(source).toEqual(original)
  })

  it('does not add lines when the target has fewer lines', () => {
    const target = newSection('verse')
    copySectionChords(sourceVerse(), target)
    expect(target.lines).toHaveLength(1)
  })
})
