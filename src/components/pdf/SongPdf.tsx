import { Document, Page, Text, View, StyleSheet, Svg, Line, Circle, Rect } from '@react-pdf/renderer'
import type { ChordVoicing, PdfOptions, Song } from '../../types'
import { getTuning } from '../../lib/tunings'
import { chordDisplayName, chordKey } from '../../lib/music'
import { voicingsFor, findVoicing } from '../../lib/voicings'
import { chordLineText, sectionLabel } from '../../lib/layout'

const FONT_SIZES = { small: 8.5, medium: 10.5, large: 13 }
const LAYOUTS = { compact: 1.35, standard: 1.6, large: 1.9 }

function PdfChordDiagram({ voicing, w = 56 }: { voicing: ChordVoicing; w?: number }) {
  const sw = 10
  const fh = 12
  const padX = 10
  const padTop = 14
  const padBottom = 4
  const FRETS = 4
  const vw = padX * 2 + sw * 5
  const vh = padTop + fh * FRETS + padBottom
  const nut = voicing.baseFret <= 1
  const x = (s: number) => padX + s * sw
  const y = (f: number) => padTop + (f - voicing.baseFret + 0.5) * fh

  return (
    <Svg width={w} height={(w * vh) / vw} viewBox={`0 0 ${vw} ${vh}`}>
      {Array.from({ length: FRETS + 1 }, (_, i) => (
        <Line
          key={`f${i}`}
          x1={x(0)}
          y1={padTop + i * fh}
          x2={x(5)}
          y2={padTop + i * fh}
          stroke="#000"
          strokeWidth={i === 0 && nut ? 2.4 : 0.6}
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Line
          key={`s${i}`}
          x1={x(i)}
          y1={padTop}
          x2={x(i)}
          y2={padTop + FRETS * fh}
          stroke="#000"
          strokeWidth={0.6}
        />
      ))}
      {voicing.frets.map((f, i) => {
        if (f === 'x')
          return (
            <Text key={i} x={x(i) - 2.4} y={padTop - 11} style={{ fontSize: 7, fontFamily: 'Courier' }}>
              x
            </Text>
          )
        if (f === 0)
          return <Circle key={i} cx={x(i)} cy={padTop - 6} r={2} stroke="#000" strokeWidth={0.8} fill="none" />
        return null
      })}
      {!nut && (
        <Text x={0.5} y={y(voicing.baseFret) - 3} style={{ fontSize: 6, fontFamily: 'Courier' }}>
          {voicing.baseFret}fr
        </Text>
      )}
      {(voicing.barres ?? []).map((b, i) => (
        <Rect
          key={`b${i}`}
          x={x(b.fromString) - 3}
          y={y(b.fret) - 3}
          width={(b.toString - b.fromString) * sw + 6}
          height={6}
          rx={3}
          fill="#000"
        />
      ))}
      {voicing.frets.map((f, i) => {
        if (f === 'x' || f === 0) return null
        const inBarre = (voicing.barres ?? []).some(
          b => b.fret === f && i >= b.fromString && i <= b.toString,
        )
        if (inBarre) return null
        return <Circle key={i} cx={x(i)} cy={y(f)} r={3} fill="#000" />
      })}
    </Svg>
  )
}

export function SongPdf({ song, options }: { song: Song; options: PdfOptions }) {
  const tuning = getTuning(song.tuningId, song.customTunings)
  const fs = FONT_SIZES[options.fontSize]
  const lh = LAYOUTS[options.layout]

  const styles = StyleSheet.create({
    page: { padding: 50, fontFamily: 'Courier', fontSize: fs, color: '#000' },
    title: { fontFamily: 'Helvetica-Bold', fontSize: fs * 2.1, textAlign: 'center', letterSpacing: 1 },
    meta: { textAlign: 'center', fontSize: fs * 0.85, marginTop: 8 },
    section: { marginTop: 18 * lh },
    sectionLabel: {
      fontFamily: 'Helvetica-Bold',
      fontSize: fs * 0.8,
      letterSpacing: 2,
      marginBottom: 4,
    },
    linePair: { marginBottom: fs * (lh - 1) },
    chordLine: { fontFamily: 'Courier-Bold', fontSize: fs },
    lyricLine: { fontFamily: 'Courier', fontSize: fs },
    notes: { marginTop: 24, fontSize: fs * 0.85, borderTopWidth: 0.5, borderTopColor: '#999', paddingTop: 8 },
    diagramsBlock: { marginTop: 20 },
    diagramRow: { flexDirection: 'row', flexWrap: 'wrap' },
    diagramCell: { alignItems: 'center', marginRight: 14, marginBottom: 10 },
    diagramName: { fontFamily: 'Courier-Bold', fontSize: fs * 0.8, marginBottom: 2 },
    pageNum: {
      position: 'absolute',
      bottom: 24,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 8,
      color: '#666',
    },
  })

  const metaParts = [
    song.artist,
    song.key ? `Key: ${song.key}` : null,
    options.showTuning ? `Tuning: ${tuning.name}` : null,
    options.showCapo && song.capo > 0 ? `Capo: ${song.capo}` : null,
    song.bpm ? `${song.bpm} bpm` : null,
  ].filter(Boolean)

  const uniqueChords = new Map<string, { name: string; voicing?: ChordVoicing }>()
  for (const s of song.sections)
    for (const l of s.lines)
      for (const pc of l.chords) {
        const k = chordKey(pc.chord)
        if (!uniqueChords.has(k)) {
          const v = pc.voicingId
            ? findVoicing(pc.voicingId, pc.chord, tuning, song.customVoicings)
            : voicingsFor(pc.chord, tuning, song.customVoicings)[0]
          uniqueChords.set(k, { name: chordDisplayName(pc.chord), voicing: v })
        }
      }

  return (
    <Document title={song.title} author={song.artist ?? 'Tabby'}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{song.title.toUpperCase()}</Text>
        {metaParts.length > 0 && <Text style={styles.meta}>{metaParts.join('    ')}</Text>}

        {options.showChordDiagrams && uniqueChords.size > 0 && (
          <View style={styles.diagramsBlock}>
            <Text style={styles.sectionLabel}>CHORDS</Text>
            <View style={styles.diagramRow}>
              {[...uniqueChords.values()].map((c, i) => (
                <View key={i} style={styles.diagramCell}>
                  <Text style={styles.diagramName}>{c.name}</Text>
                  {c.voicing ? (
                    <PdfChordDiagram voicing={c.voicing} />
                  ) : (
                    <Text style={{ fontSize: fs * 0.7 }}>no voicing</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {song.sections.map(section => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionLabel} minPresenceAhead={fs * lh * 3}>
              {sectionLabel(section)}
            </Text>
            {section.lines.map(line => {
              const cl = chordLineText(line)
              return (
                <View key={line.id} style={styles.linePair} wrap={false}>
                  {cl ? <Text style={styles.chordLine}>{cl}</Text> : null}
                  <Text style={[styles.lyricLine, { lineHeight: lh }]}>{line.text || ' '}</Text>
                </View>
              )
            })}
          </View>
        ))}

        {options.showNotes && song.notes ? <Text style={styles.notes}>{song.notes}</Text> : null}

        <Text
          style={styles.pageNum}
          render={({ pageNumber, totalPages }) => `${song.title} — ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
