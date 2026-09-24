import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { firebaseEnabled, onUserChanged, signInWithGoogle, signOutUser } from '../lib/firebase'
import { syncAll } from '../lib/sync'

export function AuthButton({ onSynced }: { onSynced?: () => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => onUserChanged(setUser), [])

  if (!firebaseEnabled) return null

  const signIn = async () => {
    setBusy(true)
    try {
      await signInWithGoogle()
      const { pulled, pushed } = await syncAll()
      setSyncMsg(`synced ↓${pulled} ↑${pushed}`)
      setTimeout(() => setSyncMsg(null), 4000)
      onSynced?.()
    } catch (e) {
      setSyncMsg('sign-in failed')
      console.warn(e)
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {syncMsg && <span className="text-xs text-faint">{syncMsg}</span>}
        <span
          className="text-xs text-ink-soft hidden sm:inline max-w-32 truncate"
          title={user.email ?? ''}
        >
          {user.displayName ?? user.email}
        </span>
        <button
          onClick={() => void signOutUser()}
          className="text-sm px-3 py-1.5 rounded-md border border-line hover:border-ink/40"
          title="Sign out — songs stay in the cloud and on this device"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {syncMsg && <span className="text-xs text-faint">{syncMsg}</span>}
      <button
        onClick={() => void signIn()}
        disabled={busy}
        className="text-sm px-3 py-1.5 rounded-md border border-line hover:border-ink/40 disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in to sync'}
      </button>
    </div>
  )
}
