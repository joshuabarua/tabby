import type { Tuning } from '../types'

export const BUILTIN_TUNINGS: Tuning[] = [
  { id: 'standard', name: 'Standard', strings: ['E', 'A', 'D', 'G', 'B', 'E'], builtin: true },
  { id: 'drop-d', name: 'Drop D', strings: ['D', 'A', 'D', 'G', 'B', 'E'], builtin: true },
  { id: 'dadgad', name: 'DADGAD', strings: ['D', 'A', 'D', 'G', 'A', 'D'], builtin: true },
  { id: 'open-g', name: 'Open G', strings: ['D', 'G', 'D', 'G', 'B', 'D'], builtin: true },
  { id: 'open-d', name: 'Open D', strings: ['D', 'A', 'D', 'F#', 'A', 'D'], builtin: true },
  { id: 'open-e', name: 'Open E', strings: ['E', 'B', 'E', 'G#', 'B', 'E'], builtin: true },
]

export function getTuning(id: string, customTunings: Tuning[] = []): Tuning {
  return (
    BUILTIN_TUNINGS.find(t => t.id === id) ??
    customTunings.find(t => t.id === id) ??
    BUILTIN_TUNINGS[0]
  )
}

export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e']
