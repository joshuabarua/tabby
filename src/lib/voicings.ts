import type { Chord, ChordVoicing, FretMark, Tuning } from '../types'
import { chordKey, chordToneSemitones, noteToSemitone } from './music'

function parseFretString(s: string): FretMark[] {
  return s.split('').map(c => (c === 'x' ? 'x' : parseInt(c, 10)))
}

type CuratedEntry = { name: string; frets: string; fingers?: (number | null)[] }

const CURATED: Record<string, Record<string, CuratedEntry[]>> = {
  standard: {
    'C:maj': [{ name: 'Open C', frets: 'x32010', fingers: [null, 3, 2, 0, 1, 0] }],
    'D:maj': [{ name: 'Open D', frets: 'xx0232', fingers: [null, null, 0, 1, 3, 2] }],
    'E:maj': [{ name: 'Open E', frets: '022100', fingers: [0, 2, 3, 1, 0, 0] }],
    'F:maj': [
      { name: 'Barre F', frets: '133211', fingers: [1, 3, 4, 2, 1, 1] },
      { name: 'F (easy)', frets: 'xx3211', fingers: [null, null, 3, 2, 1, 1] },
    ],
    'G:maj': [
      { name: 'Open G', frets: '320003', fingers: [2, 1, 0, 0, 0, 3] },
      { name: 'G (folk)', frets: '355433', fingers: [1, 3, 4, 3, 2, 1] },
    ],
    'A:maj': [
      { name: 'Open A', frets: 'x02220', fingers: [null, 0, 1, 2, 3, 0] },
      { name: 'A (one finger)', frets: 'x02225' },
    ],
    'B:maj': [{ name: 'Barre B', frets: 'x24442', fingers: [null, 1, 3, 4, 4, 2] }],
    'C#:maj': [{ name: 'Barre C#', frets: 'x46664' }],
    'Eb:maj': [{ name: 'Barre Eb', frets: 'xx1343' }],
    'F#:maj': [{ name: 'Barre F#', frets: '244322' }],
    'G#:maj': [{ name: 'Barre G#', frets: '466544' }],
    'Bb:maj': [{ name: 'Barre Bb', frets: 'x13331' }],
    'A:m': [{ name: 'Open Am', frets: 'x02210', fingers: [null, 0, 2, 3, 1, 0] }],
    'B:m': [{ name: 'Barre Bm', frets: 'x24432', fingers: [null, 1, 3, 4, 2, 1] }],
    'C:m': [{ name: 'Barre Cm', frets: 'x35543' }],
    'D:m': [{ name: 'Open Dm', frets: 'xx0231', fingers: [null, null, 0, 2, 3, 1] }],
    'E:m': [{ name: 'Open Em', frets: '022000', fingers: [0, 2, 3, 0, 0, 0] }],
    'F:m': [{ name: 'Barre Fm', frets: '133111' }],
    'G:m': [{ name: 'Barre Gm', frets: '355333' }],
    'F#:m': [{ name: 'Barre F#m', frets: '244222' }],
    'C#:m': [{ name: 'Barre C#m', frets: 'x46654' }],
    'Bb:m': [{ name: 'Barre Bbm', frets: 'x13321' }],
    'A:7': [{ name: 'Open A7', frets: 'x02020', fingers: [null, 0, 2, 0, 3, 0] }],
    'B:7': [{ name: 'Open B7', frets: 'x21202', fingers: [null, 2, 1, 3, 0, 4] }],
    'C:7': [{ name: 'Open C7', frets: 'x32310', fingers: [null, 3, 2, 4, 1, 0] }],
    'D:7': [{ name: 'Open D7', frets: 'xx0212', fingers: [null, null, 0, 2, 1, 3] }],
    'E:7': [{ name: 'Open E7', frets: '020100', fingers: [0, 2, 0, 1, 0, 0] }],
    'G:7': [{ name: 'Open G7', frets: '320001', fingers: [3, 2, 0, 0, 0, 1] }],
    'F:7': [{ name: 'Barre F7', frets: '131211' }],
    'A:maj7': [{ name: 'Amaj7', frets: 'x02120' }],
    'C:maj7': [{ name: 'Cmaj7', frets: 'x32000', fingers: [null, 3, 2, 0, 0, 0] }],
    'D:maj7': [{ name: 'Dmaj7', frets: 'xx0222', fingers: [null, null, 0, 1, 1, 1] }],
    'E:maj7': [{ name: 'Emaj7', frets: '021100' }],
    'F:maj7': [{ name: 'Fmaj7', frets: 'xx3210', fingers: [null, null, 3, 2, 1, 0] }],
    'G:maj7': [{ name: 'Gmaj7', frets: '3x0002', fingers: [3, null, 0, 0, 0, 2] }],
    'A:m7': [{ name: 'Am7', frets: 'x02010', fingers: [null, 0, 2, 0, 1, 0] }],
    'B:m7': [{ name: 'Bm7', frets: 'x24232' }],
    'D:m7': [{ name: 'Dm7', frets: 'xx0211', fingers: [null, null, 0, 2, 1, 1] }],
    'E:m7': [{ name: 'Em7', frets: '020000', fingers: [0, 2, 0, 0, 0, 0] }],
    'A:sus2': [{ name: 'Asus2', frets: 'x02200', fingers: [null, 0, 1, 2, 0, 0] }],
    'A:sus4': [{ name: 'Asus4', frets: 'x02230', fingers: [null, 0, 1, 2, 3, 0] }],
    'D:sus2': [{ name: 'Dsus2', frets: 'xx0230', fingers: [null, null, 0, 1, 3, 0] }],
    'D:sus4': [{ name: 'Dsus4', frets: 'xx0233', fingers: [null, null, 0, 1, 3, 4] }],
    'E:sus4': [{ name: 'Esus4', frets: '022200' }],
    'G:sus4': [{ name: 'Gsus4', frets: '330013' }],
    'C:add9': [{ name: 'Cadd9', frets: 'x32030', fingers: [null, 3, 2, 0, 3, 0] }],
    'G:add9': [{ name: 'Gadd9', frets: '320435' }],
    'D:add9': [{ name: 'Dadd9', frets: 'x54230' }],
    'C:6': [{ name: 'C6', frets: 'x32210' }],
    'D:6': [{ name: 'D6', frets: 'xx0202' }],
    'G:6': [{ name: 'G6', frets: '320000' }],
    'A:m6': [{ name: 'Am6', frets: 'x02212' }],
    'A:9': [{ name: 'A9', frets: 'x02423' }],
    'D:9': [{ name: 'D9', frets: 'x54555' }],
    'G:9': [{ name: 'G9', frets: '320201' }],
    'C:dim': [{ name: 'Cdim', frets: 'x3454x' }],
    'D:dim': [{ name: 'Ddim', frets: 'xx0101' }],
    'C:aug': [{ name: 'Caug', frets: 'x32110' }],
    'D:aug': [{ name: 'Daug', frets: 'xx0332' }],
    'G:aug': [{ name: 'Gaug', frets: '321003' }],
    'C:5': [{ name: 'C5', frets: 'x355xx' }],
    'D:5': [{ name: 'D5', frets: 'xx023x' }],
    'E:5': [{ name: 'E5', frets: '022xxx' }],
    'G:5': [{ name: 'G5', frets: '355xxx' }],
    'A:5': [{ name: 'A5', frets: 'x022xx' }],
    'A:m7b5': [{ name: 'Am7b5', frets: 'x01010' }],
    'B:m7b5': [{ name: 'Bm7b5', frets: 'x2323x' }],
    'E:m7b5': [{ name: 'Em7b5', frets: 'xx2333' }],
    'A:dim7': [{ name: 'Adim7', frets: 'xx1212' }],
    'B:dim7': [{ name: 'Bdim7', frets: 'x2313x' }],
    'A:m9': [{ name: 'Am9', frets: 'x05500' }],
    'E:m9': [{ name: 'Em9', frets: '020002' }],
    'A:7sus4': [{ name: 'A7sus4', frets: 'x02030' }],
    'D:7sus4': [{ name: 'D7sus4', frets: 'xx0213' }],
    'E:7sus4': [{ name: 'E7sus4', frets: '020200' }],
    'G:maj:B': [{ name: 'G/B', frets: 'x20033', fingers: [null, 2, 0, 0, 3, 3] }],
    'C:maj:G': [{ name: 'C/G', frets: '332010' }],
    'D:maj:F#': [{ name: 'D/F#', frets: '200232', fingers: [2, 0, 0, 2, 3, 2] }],
    'E:maj:G#': [{ name: 'E/G#', frets: '4x2400' }],
    'A:maj:E': [{ name: 'A/E', frets: '002220' }],
    'A:maj:C#': [{ name: 'A/C#', frets: 'x42220' }],
    'F:maj:A': [{ name: 'F/A', frets: 'x03211' }],
    'A:m:G': [{ name: 'Am/G', frets: '302210' }],
    'D:m:F': [{ name: 'Dm/F', frets: '100231' }],
  },
  'drop-d': {
    'D:maj': [{ name: 'Open D (Drop D)', frets: '000232', fingers: [0, 0, 0, 1, 3, 2] }],
    'D:5': [{ name: 'D5 (Drop D)', frets: '000xxx' }],
    'G:maj': [{ name: 'G (Drop D)', frets: '550033' }],
    'D:m': [{ name: 'Dm (Drop D)', frets: '000231' }],
  },
  dadgad: {
    'D:maj': [{ name: 'D (DADGAD)', frets: '000200', fingers: [0, 0, 0, 2, 0, 0] }],
    'D:sus4': [{ name: 'Dsus4 (DADGAD)', frets: '000000' }],
    'D:5': [{ name: 'D5 (DADGAD)', frets: '000x00' }],
    'G:maj': [{ name: 'G (DADGAD)', frets: '5x0430' }],
  },
  'open-g': {
    'G:maj': [{ name: 'Open G', frets: '000000' }],
    'G:5': [{ name: 'G5', frets: '000xxx' }],
  },
  'open-d': {
    'D:maj': [{ name: 'Open D', frets: '000000' }],
    'G:maj': [{ name: 'G (Open D)', frets: '555555' }],
    'A:maj': [{ name: 'A (Open D)', frets: '777777' }],
  },
  'open-e': {
    'E:maj': [{ name: 'Open E', frets: '000000' }],
  },
}

function curatedFor(chord: Chord, tuningId: string): CuratedEntry[] {
  const table = CURATED[tuningId]
  if (!table) return []
  const key = chordKey(chord)
  const entries = table[key] ?? []
  return entries
}

// ---- algorithmic voicing generation ----------------------------------------

type StringOption = FretMark

function* combos(options: StringOption[][]): Generator<FretMark[]> {
  const out: FretMark[] = new Array(options.length)
  function* walk(i: number): Generator<FretMark[]> {
    if (i === options.length) {
      yield [...out]
      return
    }
    for (const o of options[i]) {
      out[i] = o
      yield* walk(i + 1)
    }
  }
  yield* walk(0)
}

function scoreVoicing(
  frets: FretMark[],
  tones: Set<number>,
  openSemis: number[],
  chord: Chord,
): number | null {
  const sounding = frets.filter(f => f !== 'x') as number[]
  if (sounding.length < 3) return null
  const muted = frets.length - sounding.length
  if (muted > 3) return null

  const present = new Set<number>()
  frets.forEach((f, i) => {
    if (f !== 'x') present.add((openSemis[i] + f) % 12)
  })
  const coverage = present.size / tones.size
  const rootSemi = noteToSemitone(chord.root)
  if (!present.has(rootSemi)) return null

  const fretted = sounding.filter(f => f > 0)
  const minF = fretted.length ? Math.min(...fretted) : 0
  const maxF = fretted.length ? Math.max(...fretted) : 0
  const span = fretted.length ? maxF - minF : 0
  if (span > 4) return null

  let bassSemi: number | null = null
  for (let i = 0; i < frets.length; i++) {
    const f = frets[i]
    if (f !== 'x') {
      bassSemi = (openSemis[i] + f) % 12
      break
    }
  }
  const wantBass = noteToSemitone(chord.bass ?? chord.root)
  const bassBonus = bassSemi === wantBass ? 30 : bassSemi === rootSemi ? 15 : 0

  const distinctFrets = new Set(fretted).size
  const openCount = sounding.filter(f => f === 0).length
  const innerMuted = frets.slice(1, -1).filter(f => f === 'x').length

  return (
    coverage * 40 +
    bassBonus +
    sounding.length * 4 +
    openCount * 2 -
    muted * 6 -
    innerMuted * 4 -
    span * 2 -
    distinctFrets * 1.5 -
    minF * 0.8
  )
}

const MAX_GENERATED = 3

export function generateVoicings(chord: Chord, tuning: Tuning): ChordVoicing[] {
  const tones = chordToneSemitones(chord)
  const openSemis = tuning.strings.map(n => noteToSemitone(n))
  const scored: { frets: FretMark[]; score: number }[] = []
  const seen = new Set<string>()

  for (let start = 0; start <= 8; start++) {
    const end = start + 3
    const options: StringOption[][] = []
    for (let i = 0; i < 6; i++) {
      const opts: StringOption[] = ['x']
      if (tones.has(openSemis[i])) opts.push(0)
      for (let f = Math.max(1, start); f <= end; f++) {
        if (tones.has((openSemis[i] + f) % 12)) opts.push(f)
      }
      options.push(opts)
      if (opts.length > 5) break
    }
    if (options.length < 6) continue
    if (options.every(o => o.length === 1)) continue
    let count = 0
    for (const frets of combos(options)) {
      if (++count > 40000) break
      const score = scoreVoicing(frets, tones, openSemis, chord)
      if (score === null) continue
      const sig = frets.join(',')
      if (seen.has(sig)) continue
      seen.add(sig)
      scored.push({ frets, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, MAX_GENERATED).map((v, i) => buildVoicing(v.frets, tuning.id, i, true))
}

function buildVoicing(
  frets: FretMark[],
  tuningId: string,
  _index: number,
  generated: boolean,
  name?: string,
  fingers?: (number | null)[],
): ChordVoicing {
  const fretted = frets.filter((f): f is number => typeof f === 'number' && f > 0)
  const minF = fretted.length ? Math.min(...fretted) : 0
  const baseFret = Math.max(1, minF)

  let fing = fingers ?? frets.map(() => null as number | null)
  if (!fingers) {
    const levels = [...new Set(fretted)].sort((a, b) => a - b)
    const barreFret = levels[0]
    const barreCount = frets.filter(f => f === barreFret && f > 0).length
    const useBarre = barreCount >= 3 && levels.length >= 2
    let next = useBarre ? 2 : 1
    const assign = new Map<number, number>()
    for (const lvl of useBarre ? levels.slice(1) : levels) {
      assign.set(lvl, Math.min(next++, 4))
    }
    fing = frets.map(f =>
      f === 'x' || f === 0 ? null : f === barreFret && useBarre ? 1 : (assign.get(f as number) ?? 4),
    )
  }

  const barres: ChordVoicing['barres'] = []
  if (!fretted.length) {
    // all open / muted
  } else {
    const levels = [...new Set(fretted)].sort((a, b) => a - b)
    const lvl = levels[0]
    const idxs = frets.map((f, i) => (f === lvl ? i : -1)).filter(i => i >= 0)
    if (idxs.length >= 3) barres.push({ fret: lvl, fromString: idxs[0], toString: idxs[idxs.length - 1] })
  }

  return {
    id: `gen:${tuningId}:${frets.join('')}`,
    name: name ?? (baseFret <= 1 ? 'Open' : `Position ${baseFret}`),
    frets,
    fingers: fing,
    baseFret,
    barres,
    tuningId,
    generated,
  }
}

const voicingCache = new Map<string, ChordVoicing[]>()

export function voicingsFor(chord: Chord, tuning: Tuning, custom: ChordVoicing[] = []): ChordVoicing[] {
  const key = `${chordKey(chord)}|${tuning.id}`
  let list = voicingCache.get(key)
  if (!list) {
    const curated = curatedFor(chord, tuning.id).map((e, i) =>
      buildVoicing(parseFretString(e.frets), tuning.id, i, false, e.name, e.fingers),
    )
    const curatedSigs = new Set(curated.map(c => c.frets.join(',')))
    const generated = generateVoicings(chord, tuning).filter(
      g => !curatedSigs.has(g.frets.join(',')),
    )
    list = [...curated, ...generated].slice(0, 6)
    voicingCache.set(key, list)
  }
  const customs = custom.filter(c => c.tuningId === tuning.id)
  return [...customs, ...list]
}

export function findVoicing(
  id: string | undefined,
  chord: Chord,
  tuning: Tuning,
  custom: ChordVoicing[] = [],
): ChordVoicing | undefined {
  const all = voicingsFor(chord, tuning, custom)
  if (!id) return all[0]
  return all.find(v => v.id === id) ?? all[0]
}
