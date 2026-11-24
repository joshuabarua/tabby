import { describe, expect, it } from 'vitest'
import { isRemoteConflict, planRemoteChange, sameContent } from './remote'
import { newSong } from './song'

const at = (iso: string, title = 'Song') => ({ ...newSong(title), id: 's1', createdAt: 'c', updatedAt: iso })

describe('planRemoteChange', () => {
  it('pulls songs we do not have', () => {
    expect(planRemoteChange(undefined, at('2026-01-01'))).toBe('pull')
  })
  it('pulls only newer versions', () => {
    expect(planRemoteChange(at('2026-01-01'), at('2026-01-02'))).toBe('pull')
    expect(planRemoteChange(at('2026-01-02'), at('2026-01-01'))).toBe('ignore')
    expect(planRemoteChange(at('2026-01-01'), at('2026-01-01'))).toBe('ignore')
  })
})

describe('isRemoteConflict', () => {
  it('flags newer, different versions of the open song', () => {
    const open = at('2026-01-01', 'Mine')
    const remote = { ...at('2026-01-02', 'Theirs'), sections: open.sections }
    expect(isRemoteConflict(open, remote)).toBe(true)
  })
  it('ignores echoes of our own save and older versions', () => {
    const open = at('2026-01-02')
    expect(isRemoteConflict(open, { ...open })).toBe(false)
    expect(isRemoteConflict(open, { ...open, updatedAt: '2026-01-03' })).toBe(false)
    expect(isRemoteConflict(open, { ...open, title: 'x', updatedAt: '2026-01-01' })).toBe(false)
  })
  it('compares content without timestamps', () => {
    const a = at('1')
    expect(sameContent(a, { ...a, updatedAt: '2' })).toBe(true)
  })
})
