import type { ChordVoicing, Tuning } from '../types'

const FRETS_SHOWN = 4

export function ChordDiagram({
  voicing,
  tuning,
  width = 110,
  dark = false,
}: {
  voicing: ChordVoicing
  tuning: Tuning
  width?: number
  dark?: boolean
}) {
  const sw = 16
  const fh = 20
  const padX = 18
  const padTop = 22
  const padBottom = 18
  const w = padX * 2 + sw * 5
  const h = padTop + fh * FRETS_SHOWN + padBottom
  const scale = width / w

  const ink = dark ? '#211b12' : '#211b12'
  const faint = '#b8ad98'
  const nut = voicing.baseFret <= 1

  const x = (s: number) => padX + s * sw
  const y = (f: number) => padTop + (f - voicing.baseFret + 0.5) * fh

  const stringLabel = (i: number) => tuning.strings[i]

  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Chord diagram: ${voicing.frets.join(' ')}`}
      className="select-none"
    >
      {/* fret lines */}
      {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
        <line
          key={i}
          x1={x(0)}
          y1={padTop + i * fh}
          x2={x(5)}
          y2={padTop + i * fh}
          stroke={i === 0 && nut ? ink : faint}
          strokeWidth={i === 0 && nut ? 4 : 1.2}
          strokeLinecap="round"
        />
      ))}
      {/* strings */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={i}
          x1={x(i)}
          y1={padTop}
          x2={x(i)}
          y2={padTop + FRETS_SHOWN * fh}
          stroke={faint}
          strokeWidth={i === 0 || i === 5 ? 1.4 : 1}
        />
      ))}
      {/* base fret label */}
      {!nut && (
        <text x={x(0) - 11} y={y(voicing.baseFret) + 4} fontSize={10} fill={ink} fontFamily="IBM Plex Mono">
          {voicing.baseFret}fr
        </text>
      )}
      {/* open / muted markers */}
      {voicing.frets.map((f, i) => {
        if (f === 'x')
          return (
            <text key={i} x={x(i)} y={padTop - 7} fontSize={11} fill={ink} textAnchor="middle" fontFamily="IBM Plex Mono">
              ×
            </text>
          )
        if (f === 0)
          return <circle key={i} cx={x(i)} cy={padTop - 10} r={3.4} fill="none" stroke={ink} strokeWidth={1.4} />
        return null
      })}
      {/* barres */}
      {(voicing.barres ?? []).map((b, i) => (
        <rect
          key={i}
          x={x(b.fromString) - 5.5}
          y={y(b.fret) - 5.5}
          width={(b.toString - b.fromString) * sw + 11}
          height={11}
          rx={5.5}
          fill={ink}
          opacity={0.92}
        />
      ))}
      {/* dots */}
      {voicing.frets.map((f, i) => {
        if (f === 'x' || f === 0) return null
        const inBarre = (voicing.barres ?? []).some(
          b => b.fret === f && i >= b.fromString && i <= b.toString,
        )
        if (inBarre && i !== voicing.barres?.find(b => b.fret === f)?.toString) return null
        return (
          <g key={i}>
            {!inBarre && <circle cx={x(i)} cy={y(f)} r={5.5} fill={ink} />}
            {voicing.fingers?.[i] != null && (
              <text
                x={x(i)}
                y={y(f) + 3.4}
                fontSize={8.5}
                fill="#f6f1e7"
                textAnchor="middle"
                fontFamily="Instrument Sans Variable, sans-serif"
                fontWeight={700}
              >
                {inBarre ? 1 : voicing.fingers[i]}
              </text>
            )}
          </g>
        )
      })}
      {/* tuning labels */}
      {voicing.frets.map((_, i) => (
        <text
          key={i}
          x={x(i)}
          y={h - 4}
          fontSize={8.5}
          fill={faint}
          textAnchor="middle"
          fontFamily="IBM Plex Mono"
        >
          {stringLabel(i)}
        </text>
      ))}
    </svg>
  )
}
