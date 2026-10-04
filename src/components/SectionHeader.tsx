import type { Section, SectionType } from '../types'

export function SectionHeader({
  section,
  index,
  count,
  types,
  onMeta,
  onMove,
  onDelete,
  onCopy,
  onCopyChords,
  canCopyChords,
}: {
  section: Section
  index: number
  count: number
  types: { value: SectionType; label: string }[]
  onMeta: (patch: Partial<Pick<Section, 'type' | 'title'>>) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
  onCopy: () => void
  onCopyChords?: () => void
  canCopyChords: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-1 group">
      <select
        value={section.type}
        onChange={e => onMeta({ type: e.target.value as SectionType })}
        className="bg-transparent text-[11px] uppercase tracking-widest text-accent font-semibold cursor-pointer"
        aria-label="Section type"
      >
        {types.map(t => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        value={section.title ?? ''}
        onChange={e => onMeta({ title: e.target.value })}
        placeholder={types.find(t => t.value === section.type)?.label ?? 'Section'}
        className="bg-transparent text-[11px] uppercase tracking-widest text-ink-soft border-b border-transparent hover:border-line focus:border-accent w-32"
        aria-label="Section title"
      />
      <div className="flex-1 border-t border-dashed border-line" />
      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
        <button
          onClick={onCopy}
          className="px-2 py-1 text-[11px] rounded border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
          title="Duplicate this section's lyrics and chords"
        >
          Copy section
        </button>
        {onCopyChords && (
          <button
            onClick={onCopyChords}
            disabled={!canCopyChords}
            className="px-2 py-1 text-[11px] rounded border border-chord/40 text-chord enabled:hover:border-chord disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={canCopyChords
              ? 'Copy chords onto the same word number of matching lines; keeps lyrics and extra lines. Chords on words the line does not have are skipped.'
              : 'Add chords to the first verse before copying them'}
          >
            Copy chords from first verse
          </button>
        )}
      </div>
      <div className="sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-0.5">
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="w-6 h-6 text-xs rounded border border-line text-ink-soft disabled:opacity-30 hover:border-ink/40"
          aria-label="Move section up"
        >
          ↑
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          className="w-6 h-6 text-xs rounded border border-line text-ink-soft disabled:opacity-30 hover:border-ink/40"
          aria-label="Move section down"
        >
          ↓
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 text-xs rounded border border-line text-accent hover:bg-accent hover:text-white"
          aria-label="Delete section"
        >
          ×
        </button>
      </div>
    </div>
  )
}
