import type { LyricLine } from '../types'
import { chordDisplayName } from './music'

export function chordLineText(line: LyricLine): string {
  if (line.chords.length === 0) return ''
  const sorted = [...line.chords].sort((a, b) => a.position - b.position)
  const chars: string[] = []
  for (const pc of sorted) {
    const name = chordDisplayName(pc.chord)
    let start = pc.position
    while (start < chars.length && chars[start] !== ' ') start++
    while (chars.length < start) chars.push(' ')
    for (let i = 0; i < name.length; i++) chars[start + i] = name[i]
    if (chars.length === start + name.length) chars.push(' ')
    else chars[start + name.length] = ' '
  }
  return chars.join('').replace(/\s+$/, '')
}

export function sectionLabel(section: { type: string; title?: string }): string {
  const base = section.title?.trim() || section.type.replace(/^[a-z]/, c => c.toUpperCase())
  return base.toUpperCase()
}
