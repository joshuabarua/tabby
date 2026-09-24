import { useState } from 'react'
import type { PdfOptions } from '../../types'
import { useSong } from '../../state/SongContext'

export function PdfExportDialog({ onClose }: { onClose: () => void }) {
  const { song } = useSong()
  const [options, setOptions] = useState<PdfOptions>({
    showChordDiagrams: true,
    showTuning: true,
    showCapo: true,
    showNotes: false,
    fontSize: 'medium',
    layout: 'standard',
  })
  const [busy, setBusy] = useState(false)

  const toggle = (k: keyof Pick<PdfOptions, 'showChordDiagrams' | 'showTuning' | 'showCapo' | 'showNotes'>) =>
    setOptions(o => ({ ...o, [k]: !o[k] }))

  const exportPdf = async () => {
    setBusy(true)
    try {
      const [{ pdf }, { SongPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./SongPdf'),
      ])
      const blob = await pdf(<SongPdf song={song} options={options} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${song.title.replace(/[^\w\- ]+/g, '').trim() || 'song'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const checks: { key: keyof PdfOptions & string; label: string }[] = [
    { key: 'showChordDiagrams', label: 'Show chord diagrams' },
    { key: 'showTuning', label: 'Show tuning' },
    { key: 'showCapo', label: 'Show capo' },
    { key: 'showNotes', label: 'Show notes' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-[2px] p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="PDF export options"
    >
      <div
        className="fade-up w-full sm:max-w-md bg-surface border border-line sm:rounded-xl rounded-t-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">PDF options</h2>
          <button onClick={onClose} className="text-faint hover:text-ink text-xl px-1" aria-label="Close">
            ×
          </button>
        </div>

        <div className="space-y-2 mb-5">
          {checks.map(c => (
            <label key={c.key} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={options[c.key as 'showChordDiagrams'] as boolean}
                onChange={() => toggle(c.key as 'showChordDiagrams')}
                className="accent-[#b4532a] w-4 h-4"
              />
              {c.label}
            </label>
          ))}
        </div>

        <p className="text-[11px] uppercase tracking-widest text-faint mb-1.5">Font size</p>
        <div className="flex gap-4 mb-5">
          {(['small', 'medium', 'large'] as const).map(s => (
            <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer capitalize">
              <input
                type="radio"
                name="pdf-font"
                checked={options.fontSize === s}
                onChange={() => setOptions(o => ({ ...o, fontSize: s }))}
                className="accent-[#b4532a]"
              />
              {s}
            </label>
          ))}
        </div>

        <p className="text-[11px] uppercase tracking-widest text-faint mb-1.5">Layout</p>
        <div className="flex gap-4 mb-6">
          {(['compact', 'standard', 'large'] as const).map(l => (
            <label key={l} className="flex items-center gap-1.5 text-sm cursor-pointer capitalize">
              <input
                type="radio"
                name="pdf-layout"
                checked={options.layout === l}
                onChange={() => setOptions(o => ({ ...o, layout: l }))}
                className="accent-[#b4532a]"
              />
              {l === 'large' ? 'Large print' : l}
            </label>
          ))}
        </div>

        <button
          onClick={exportPdf}
          disabled={busy}
          className="w-full py-2.5 rounded-md bg-ink text-paper font-medium hover:bg-ink/85 disabled:opacity-50"
        >
          {busy ? 'Generating…' : 'Export PDF (A4)'}
        </button>
      </div>
    </div>
  )
}
