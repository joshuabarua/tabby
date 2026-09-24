// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { SongProvider } from './state/SongContext'
import { SongEditor } from './components/SongEditor'
import { newSong, validateSong } from './lib/song'

describe('app smoke', () => {
  it('library renders empty state', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('No songs yet')).toBeTruthy())
    expect(screen.getByText('+ New song')).toBeTruthy()
  })

  it('editor renders with metadata and palette', async () => {
    const song = newSong('My Song')
    render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    await waitFor(() => expect(screen.getByDisplayValue('My Song')).toBeTruthy())
    expect(screen.getByText('Transpose')).toBeTruthy()
    expect(screen.getByText('Export PDF')).toBeTruthy()
    expect(screen.getByText('Preview')).toBeTruthy()
  })

  it('validates song schema', () => {
    expect(validateSong(newSong()).song).toBeTruthy()
    expect(validateSong({ junk: true }).error).toBeTruthy()
    const bad = newSong()
    bad.sections[0].lines[0].chords.push({
      id: 'x',
      chord: { root: 'G', quality: 'maj' },
      position: 99,
    })
    expect(validateSong(bad).error).toBeTruthy()
  })
})
