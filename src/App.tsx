import { Suspense, lazy, useEffect, useState } from 'react'
import type { Song } from './types'
import { SongProvider } from './state/SongContext'
import { SongLibrary } from './components/SongLibrary'
import { savePrefs } from './lib/storage'
import { startCloudSync } from './lib/sync'

const SongEditor = lazy(() =>
  import('./components/SongEditor').then(m => ({ default: m.SongEditor })),
)

export default function App() {
  const [openSong, setOpenSong] = useState<Song | null>(null)

  useEffect(() => startCloudSync(), [])

  const open = (song: Song) => {
    savePrefs({ lastSongId: song.id })
    setOpenSong(song)
  }

  if (!openSong) {
    return (
      <div className="h-full">
        <SongLibrary onOpen={open} />
      </div>
    )
  }

  return (
    <div className="h-full">
      <SongProvider key={openSong.id} initial={openSong}>
        <Suspense
          fallback={
            <div
              role="status"
              className="h-full flex items-center justify-center text-sm text-faint"
            >
              Loading editor…
            </div>
          }
        >
          <SongEditor onOpenLibrary={() => setOpenSong(null)} />
        </Suspense>
      </SongProvider>
    </div>
  )
}
