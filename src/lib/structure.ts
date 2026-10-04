import type { Section, SectionType } from '../types'

const LABELS: Record<SectionType, string> = {
  intro: 'Intro',
  verse: 'Verse',
  prechorus: 'Pre-chorus',
  chorus: 'Chorus',
  bridge: 'Bridge',
  instrumental: 'Instrumental',
  outro: 'Outro',
  custom: 'Section',
}

export type SectionSuggestion = { type: SectionType; title: string }

const NUMBERED = /^(.*?)\s+(\d+)$/

export function nextSectionTitle(type: SectionType, sections: Section[], title?: string): string {
  const base = title?.trim() || LABELS[type]
  const own = base.match(NUMBERED)
  const stem = own ? own[1] : base
  let highest = own ? parseInt(own[2], 10) : 0
  let count = 0
  for (const s of sections) {
    const eff = s.title?.trim() || LABELS[s.type]
    const m = eff.match(NUMBERED)
    const sStem = m ? m[1] : eff
    if (sStem.toLowerCase() !== stem.toLowerCase()) continue
    count++
    if (m) highest = Math.max(highest, parseInt(m[2], 10))
  }
  const top = Math.max(highest, count)
  return `${stem} ${top === 0 ? 1 : top + 1}`
}

export function suggestSections(sections: Section[]): SectionSuggestion[] {
  const count = (t: SectionType) => sections.filter(s => s.type === t).length
  const last = sections.at(-1)?.type
  const picks: SectionType[] = []
  const add = (t: SectionType) => {
    if (!picks.includes(t)) picks.push(t)
  }

  switch (last) {
    case 'intro':
      add('verse')
      add('instrumental')
      break
    case 'verse':
      if (count('chorus') === 0) {
        if (count('prechorus') === 0) add('prechorus')
        add('chorus')
      } else {
        add('chorus')
        add('verse')
      }
      break
    case 'prechorus':
      add('chorus')
      break
    case 'chorus':
      add('verse')
      if (count('chorus') >= 2 && count('bridge') === 0) add('bridge')
      if (count('chorus') >= 3 || count('bridge') > 0) add('outro')
      break
    case 'bridge':
      add('chorus')
      add('outro')
      break
    case 'instrumental':
      add('chorus')
      add('verse')
      break
    case 'outro':
    case 'custom':
    default:
      add('verse')
      add('chorus')
      break
  }

  return picks.slice(0, 3).map(type => ({
    type,
    title: type === 'verse' ? nextSectionTitle('verse', sections) : LABELS[type],
  }))
}
