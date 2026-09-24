import { useState } from 'react'
import type { Song } from './types'
import { SongProvider } from './state/SongContext'
import { SongEditor } from './components/SongEditor'
import { SongLibrary } from './components/SongLibrary'
import { savePrefs } from './lib/storage'

export default function App() {
  const [openSong, setOpenSong] = useState<Song | null>(null)

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
        <SongEditor onOpenLibrary={() => setOpenSong(null)} />
      </SongProvider>
    </div>
  )
}
