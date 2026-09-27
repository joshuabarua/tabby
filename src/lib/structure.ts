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
    title: type === 'verse' ? `Verse ${count('verse') + 1}` : LABELS[type],
  }))
}
