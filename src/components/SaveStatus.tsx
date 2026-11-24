import { useSyncExternalStore } from 'react'
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '../lib/sync'

const CLOUD: Record<SyncStatus, { text: string; tone: 'quiet' | 'busy' | 'warn' } | null> = {
  local: null,
  synced: { text: 'synced', tone: 'quiet' },
  pending: { text: 'syncing…', tone: 'busy' },
  offline: { text: 'offline — will sync later', tone: 'warn' },
  error: { text: 'sync failed', tone: 'warn' },
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, () => 'local')
}

export function SaveStatus({ saved }: { saved: boolean }) {
  const status = useSyncStatus()
  const cloud = CLOUD[status]
  return (
    <span className="text-[11px] ml-1 flex items-center gap-1" role="status" aria-live="polite">
      <span className={saved ? 'text-faint' : 'text-accent'}>{saved ? 'saved' : 'saving…'}</span>
      {cloud && (
        <>
          <span className="text-faint" aria-hidden>
            ·
          </span>
          <span
            className={
              cloud.tone === 'warn' ? 'text-accent' : cloud.tone === 'busy' ? 'text-chord' : 'text-faint'
            }
            title={
              status === 'error'
                ? 'The last cloud write failed. Your songs are safe on this device; the next save will retry.'
                : undefined
            }
          >
            {cloud.text}
          </span>
        </>
      )}
    </span>
  )
}
