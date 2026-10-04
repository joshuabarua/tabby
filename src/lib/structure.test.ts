import { describe, it, expect } from 'vitest'
import { nextSectionTitle, suggestSections } from './structure'
import { newSection } from './song'

const seq = (...types: ('intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'outro' | 'instrumental' | 'custom')[]) =>
  types.map(t => newSection(t))

describe('suggestSections', () => {
  it('verse first for empty/first section', () => {
    const s = suggestSections(seq('verse'))
    expect(s.map(x => x.type)).toContain('chorus')
    expect(s.map(x => x.type)).toContain('prechorus')
  })

  it('intro leads to verse', () => {
    const s = suggestSections(seq('intro'))
    expect(s[0].type).toBe('verse')
    expect(s[0].title).toBe('Verse 1')
  })

  it('prechorus leads to chorus', () => {
    const s = suggestSections(seq('verse', 'prechorus'))
    expect(s[0].type).toBe('chorus')
  })

  it('chorus leads to next verse, numbered', () => {
    const s = suggestSections(seq('verse', 'chorus'))
    expect(s[0].type).toBe('verse')
    expect(s[0].title).toBe('Verse 2')
  })

  it('suggests bridge after two choruses', () => {
    const s = suggestSections(seq('verse', 'chorus', 'verse', 'chorus'))
    const types = s.map(x => x.type)
    expect(types).toContain('verse')
    expect(types).toContain('bridge')
  })

  it('bridge leads back to chorus', () => {
    const s = suggestSections(seq('verse', 'chorus', 'verse', 'chorus', 'bridge'))
    expect(s[0].type).toBe('chorus')
    expect(s.map(x => x.type)).toContain('outro')
  })

  it('no duplicates, max 3', () => {
    for (const sec of [seq('verse'), seq('intro', 'verse', 'chorus'), seq()]) {
      const s = suggestSections(sec)
      expect(new Set(s.map(x => x.type)).size).toBe(s.length)
      expect(s.length).toBeLessThanOrEqual(3)
    }
  })

  it('never offers an already occupied verse number', () => {
    const secs = [newSection('verse', 'Verse 9'), newSection('chorus', 'Chorus')]
    const verse = suggestSections(secs).find(x => x.type === 'verse')
    expect(verse?.title).toBe('Verse 10')
  })
})

describe('nextSectionTitle', () => {
  it('numbers past the highest matching suffix, not the count', () => {
    const secs = [newSection('verse', 'Verse 1'), newSection('verse', 'Verse 3')]
    expect(nextSectionTitle('verse', secs, 'Verse 1')).toBe('Verse 4')
  })

  it('numbers an unnumbered duplicate', () => {
    expect(nextSectionTitle('chorus', [newSection('chorus', 'Chorus')], 'Chorus')).toBe('Chorus 2')
  })

  it('keeps custom multi-word bases', () => {
    const secs = [newSection('verse', 'Quiet Verse 2'), newSection('verse', 'Quiet Verse 5')]
    expect(nextSectionTitle('verse', secs, 'Quiet Verse 5')).toBe('Quiet Verse 6')
  })

  it('uses the type label when the copied title is blank', () => {
    expect(nextSectionTitle('verse', [newSection('verse')])).toBe('Verse 2')
  })

  it('treats untitled matching sections as numbered label bases', () => {
    const secs = [newSection('verse'), newSection('verse'), newSection('verse')]
    expect(nextSectionTitle('verse', secs)).toBe('Verse 4')
  })

  it('keeps punctuation in the base', () => {
    const secs = [newSection('custom', 'Solo (soft)')]
    expect(nextSectionTitle('custom', secs, 'Solo (soft)')).toBe('Solo (soft) 2')
  })

  it('matches existing titles case-insensitively', () => {
    const secs = [newSection('verse', 'VERSE 7'), newSection('verse', 'Verse 1')]
    expect(nextSectionTitle('verse', secs, 'Verse 1')).toBe('Verse 8')
  })

  it('starts at one when nothing matches', () => {
    expect(nextSectionTitle('verse', [newSection('chorus', 'Chorus')])).toBe('Verse 1')
  })
})
