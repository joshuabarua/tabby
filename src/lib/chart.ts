import type { Chord, LyricLine, Section, SectionType, Song } from '../types'
import { parseChord } from './music'
import { newLine, newSong, placedChord } from './song'
import { uid } from './id'
import { nextSectionTitle } from './structure'

/**
 * Turns a plain-text chord chart into a song. Understands:
 *  - chords written on the line above the lyric they belong to
 *  - inline ChordPro chords: `[G]Hello [C]world`
 *  - section headers: `[Chorus]`, `Verse 2:`, `{start_of_chorus}`, `{c: Bridge}`
 *  - metadata: `Title: …`, `Artist: …`, `Key: G`, `Capo: 2`, `BPM: 90`, `{title: …}`
 * Blank lines separate sections when no header is given.
 */

export type ParsedChart = {
  title?: string
  artist?: string
  key?: string
  capo?: number
  bpm?: number
  sections: Section[]
}

const SECTION_WORDS: [RegExp, SectionType][] = [
  [/^pre[\s-]?chorus/i, 'prechorus'],
  [/^(chorus|refrain|hook)/i, 'chorus'],
  [/^verse/i, 'verse'],
  [/^intro/i, 'intro'],
  [/^(bridge|middle\s*8)/i, 'bridge'],
  [/^(outro|coda|ending|tag)/i, 'outro'],
  [/^(instrumental|solo|interlude|break|riff)/i, 'instrumental'],
]

const HEADER_WORD =
  /^(pre[\s-]?chorus|chorus|refrain|hook|verse|intro|bridge|middle\s*8|outro|coda|ending|tag|instrumental|solo|interlude|break|riff)\b/i

/** Tokens that may sit on a chord line without making it a lyric line. */
const FILLER = /^(\|+|:?\|\|?:?|-+|\/+|%|x\d+|\(x\d+\)|\d+x|n\.?c\.?|\.\.\.?)$/i

function expandTabs(line: string): string {
  let out = ''
  for (const ch of line) {
    if (ch === '\t') out += ' '.repeat(8 - (out.length % 8))
    else out += ch
  }
  return out.replace(/\s+$/, '')
}

type ChordAt = { chord: Chord; position: number }

/** Returns chords with their columns if every token on the line is a chord (or filler). */
export function parseChordLine(line: string): ChordAt[] | null {
  const chords: ChordAt[] = []
  for (const m of line.matchAll(/\S+/g)) {
    const token = m[0]
    if (FILLER.test(token)) continue
    const inner = token.replace(/^\(/, '').replace(/\)$/, '')
    const chord = parseChord(inner)
    if (!chord) return null
    chords.push({ chord, position: m.index + (token.startsWith('(') ? 1 : 0) })
  }
  return chords.length > 0 ? chords : null
}

/** Strips inline `[G]` chords, returning the plain text and chord positions. */
function parseInlineChords(line: string): { text: string; chords: ChordAt[] } | null {
  if (!/\[[^\]]+\]/.test(line)) return null
  const chords: ChordAt[] = []
  let text = ''
  let last = 0
  for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
    const chord = parseChord(m[1])
    if (!chord) return null
    text += line.slice(last, m.index)
    chords.push({ chord, position: text.length })
    last = m.index + m[0].length
  }
  text += line.slice(last)
  return { text, chords }
}

function buildLine(text: string, chords: ChordAt[]): LyricLine {
  const needed = chords.reduce((n, c) => Math.max(n, c.position), 0)
  const padded = text.length < needed ? text.padEnd(needed, ' ') : text
  const seen = new Set<number>()
  const line = newLine(padded)
  for (const c of chords) {
    if (seen.has(c.position)) continue
    seen.add(c.position)
    line.chords.push(placedChord(c.chord, c.position))
  }
  return line
}

function sectionType(label: string): SectionType {
  for (const [re, type] of SECTION_WORDS) if (re.test(label.trim())) return type
  return 'custom'
}

type Header = { label: string; rest: string }

function parseHeader(line: string): Header | null {
  const t = line.trim()
  const bracket = t.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (bracket && !parseChord(bracket[1])) {
    return { label: bracket[1].replace(/:$/, '').trim(), rest: bracket[2] }
  }
  const word = t.match(HEADER_WORD)
  if (!word) return null
  const after = t.slice(word[0].length)
  const m = after.match(/^(\s*\d+)?\s*(\([^)]*\))?\s*(:)?\s*(.*)$/)
  if (!m) return null
  const rest = m[4] ?? ''
  // "Verse 2:" / "Chorus" / "Intro: G C D" are headers; "Chorus girls sing" is a lyric.
  if (rest && !m[3] && !parseChordLine(rest)) return null
  return { label: (word[0] + (m[1] ?? '') + (m[2] ? ' ' + m[2] : '')).trim(), rest }
}

const META = /^(title|artist|key|capo|bpm|tempo)\s*:\s*(.+)$/i
const DIRECTIVE = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i

export function parseChordChart(input: string): ParsedChart {
  const result: ParsedChart = { sections: [] }
  let current: Section | null = null
  let pendingChords: ChordAt[] | null = null
  let breakPending = false
  let seenContent = false

  const startSection = (type: SectionType, label?: string) => {
    const title = label
      ? label.replace(/\b\w/, c => c.toUpperCase())
      : nextSectionTitle(type, result.sections)
    current = { id: uid(), type, title, lines: [] }
    result.sections.push(current)
    breakPending = false
  }

  const ensureSection = (): Section => {
    if (!current || (breakPending && current.lines.length > 0)) startSection('verse')
    breakPending = false
    return current!
  }

  const flushChords = () => {
    if (pendingChords) ensureSection().lines.push(buildLine('', pendingChords))
    pendingChords = null
  }

  const setMeta = (key: string, value: string) => {
    const v = value.trim()
    switch (key.toLowerCase()) {
      case 'title':
      case 't':
        result.title = v
        break
      case 'artist':
      case 'subtitle':
      case 'st':
        result.artist = v
        break
      case 'key':
        result.key = v
        break
      case 'capo': {
        const n = parseInt(v, 10)
        if (n >= 0 && n <= 12) result.capo = n
        break
      }
      case 'bpm':
      case 'tempo': {
        const n = parseInt(v, 10)
        if (n > 0) result.bpm = n
        break
      }
    }
  }

  for (const raw of input.replace(/\r\n?/g, '\n').split('\n')) {
    const line = expandTabs(raw)

    if (!line.trim()) {
      flushChords()
      breakPending = true
      continue
    }

    const directive = line.trim().match(DIRECTIVE)
    if (directive) {
      flushChords()
      const [, name, value = ''] = directive
      const n = name.toLowerCase()
      if (/^(soc|start_of_chorus)$/.test(n)) startSection('chorus', value || 'Chorus')
      else if (/^(sov|start_of_verse)$/.test(n)) startSection('verse', value || undefined)
      else if (/^(sob|start_of_bridge)$/.test(n)) startSection('bridge', value || 'Bridge')
      else if (/^(eo[cvb]|end_of_\w+)$/.test(n)) breakPending = true
      else if (/^(c|comment|ci|comment_italic)$/.test(n) && value) {
        startSection(sectionType(value), value)
      } else setMeta(n, value)
      continue
    }

    const meta = !seenContent && line.trim().match(META)
    if (meta) {
      setMeta(meta[1], meta[2])
      continue
    }

    const header = parseHeader(line)
    if (header) {
      flushChords()
      startSection(sectionType(header.label), header.label)
      seenContent = true
      const chords = header.rest && parseChordLine(header.rest)
      if (chords) current!.lines.push(buildLine('', chords))
      else if (header.rest) current!.lines.push(newLine(header.rest))
      continue
    }

    seenContent = true

    const chordLine = parseChordLine(line)
    if (chordLine) {
      flushChords()
      pendingChords = chordLine
      continue
    }

    const inline = parseInlineChords(line)
    if (inline) {
      flushChords()
      ensureSection().lines.push(buildLine(inline.text, inline.chords))
      continue
    }

    const section = ensureSection()
    section.lines.push(buildLine(line, pendingChords ?? []))
    pendingChords = null
  }
  flushChords()

  result.sections = result.sections.filter(s => s.lines.length > 0)
  return result
}

export function songFromChart(input: string): { song?: Song; error?: string } {
  const parsed = parseChordChart(input)
  if (parsed.sections.length === 0) return { error: 'Nothing to import — paste some lyrics or chords.' }
  const song = newSong(parsed.title || 'Untitled Song')
  song.artist = parsed.artist
  song.key = parsed.key
  if (parsed.capo !== undefined) song.capo = parsed.capo
  song.bpm = parsed.bpm
  song.sections = parsed.sections
  return { song }
}
