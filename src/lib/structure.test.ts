import { describe, it, expect } from 'vitest'
import { suggestSections } from './structure'
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
})
