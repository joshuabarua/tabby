import { describe, it, expect } from 'vitest'
import { detectKey } from './keydetect'
import { newSong, newSection, newLine, placedChord } from './song'
import { parseChord } from './music'
import type { Section } from '../types'

function songWithChords(...names: string[]) {
  const song = newSong()
  const line = newLine('a b c d e f g h i j k l m n o p')
  names.forEach((n, i) => line.chords.push(placedChord(parseChord(n)!, i * 3)))
  const section: Section = { ...newSection('verse'), lines: [line] }
  song.sections = [section]
  return song
}

describe('detectKey', () => {
  it('returns null with no chords', () => {
    expect(detectKey(newSong())).toBeNull()
  })

  it('detects G major from G C D Em', () => {
    expect(detectKey(songWithChords('G', 'C', 'D', 'Em', 'G'))).toBe('G')
  })

  it('detects C major', () => {
    expect(detectKey(songWithChords('C', 'F', 'G', 'Am', 'C'))).toBe('C')
  })

  it('detects a minor leaning key', () => {
    const k = detectKey(songWithChords('Am', 'Am', 'Dm', 'E', 'Am'))
    expect(k).toMatch(/^A/)
  })
})
