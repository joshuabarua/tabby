// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, describe, it, expect } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { SongProvider } from './state/SongContext'
import { SongEditor } from './components/SongEditor'
import { newLine, newSection, newSong, placedChord, validateSong } from './lib/song'

afterEach(cleanup)

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

  it('copies a section directly after its source and supports undo', () => {
    const song = newSong()
    song.sections[0].lines = [{ ...newLine('Original lyrics'), chords: [placedChord({ root: 'G', quality: 'maj' }, 0)] }]
    song.sections.push(newSection('chorus', 'Chorus'))
    const { container } = render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    fireEvent.click(within(container.querySelector('section')!).getByRole('button', { name: 'Duplicate section' }))
    let sections = container.querySelectorAll('section')
    expect(sections).toHaveLength(3)
    const copiedTitle = () =>
      (within(sections[1]).getByRole('textbox', { name: 'Section title' }) as HTMLInputElement).value
    expect(copiedTitle()).toBe('Verse 2')
    expect(within(sections[1]).getByDisplayValue('Original lyrics')).toBeTruthy()
    expect(within(sections[1]).getByRole('button', { name: 'Chord G' })).toBeTruthy()
    expect((within(sections[2]).getByRole('textbox', { name: 'Section title' }) as HTMLInputElement).value).toBe('Chorus')
    fireEvent.change(within(sections[0]).getByDisplayValue('Original lyrics'), {
      target: { value: 'Edited lyrics' },
    })
    expect(within(sections[1]).getByDisplayValue('Original lyrics')).toBeTruthy()
    fireEvent.click(within(sections[0]).getByRole('button', { name: 'Duplicate section' }))
    sections = container.querySelectorAll('section')
    expect(sections).toHaveLength(4)
    expect((within(sections[1]).getByRole('textbox', { name: 'Section title' }) as HTMLInputElement).value).toBe('Verse 3')
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    expect(container.querySelectorAll('section')).toHaveLength(2)
  })

  it('copies chords from the first verse, preserves lyrics and supports undo/redo', () => {
    const song = newSong()
    song.sections[0].lines = [{ ...newLine('First verse lyric'), chords: [placedChord({ root: 'G', quality: 'maj' }, 0)] }]
    const second = newSection('verse', 'Verse 2')
    second.lines = [{ ...newLine('Second verse lyric'), chords: [placedChord({ root: 'C', quality: 'maj' }, 0)] }]
    const third = newSection('verse', 'Verse 3')
    third.lines = [newLine('Third verse lyric')]
    song.sections.push(second, newSection('chorus', 'Chorus'), third)
    const { container } = render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    const sections = container.querySelectorAll('section')
    const name = 'Copy chords from first verse'
    expect(within(sections[0]).queryByRole('button', { name })).toBeNull()
    expect(within(sections[2]).queryByRole('button', { name })).toBeNull()
    fireEvent.click(within(sections[3]).getByRole('button', { name }))
    expect(within(sections[3]).getByRole('button', { name: 'Chord G' })).toBeTruthy()
    fireEvent.click(within(sections[1]).getByRole('button', { name }))
    expect(within(sections[1]).getByDisplayValue('Second verse lyric')).toBeTruthy()
    expect(within(sections[1]).getByRole('button', { name: 'Chord G' })).toBeTruthy()
    expect(within(sections[1]).queryByRole('button', { name: 'Chord C' })).toBeNull()
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    expect(within(sections[1]).getByRole('button', { name: 'Chord C' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true })
    expect(within(sections[1]).getByRole('button', { name: 'Chord G' })).toBeTruthy()
  })

  it('disables copying verse chords when the first verse has no chords', () => {
    const song = newSong()
    const second = newSection('verse', 'Verse 2')
    second.lines[0].chords = [placedChord({ root: 'C', quality: 'maj' }, 0)]
    song.sections.push(second)
    render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    expect((screen.getByRole('button', { name: 'Copy chords from first verse' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('copies chords to the same word, not the same character position', () => {
    const song = newSong()
    song.sections[0].lines = [{ ...newLine('One tiny moon'), chords: [placedChord({ root: 'G', quality: 'maj' }, 9)] }]
    const second = newSection('verse', 'Verse 2')
    second.lines = [newLine('Some extraordinarily bright stars')]
    song.sections.push(second)
    const { container } = render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    const sections = container.querySelectorAll('section')
    fireEvent.click(within(sections[1]).getByRole('button', { name: 'Copy chords from first verse' }))
    const source = within(sections[0]).getByRole('button', { name: 'Chord G' })
    const copied = within(sections[1]).getByRole('button', { name: 'Chord G' })
    expect(copied).not.toBe(source)
    expect(source.style.left).toBe(`${9 * 8}px`)
    expect(copied.style.left).toBe(`${21 * 8}px`)
  })

  it('copies chords only from the first chorus to a later chorus, with undo/redo', () => {
    const song = newSong()
    const chorus1 = newSection('chorus', 'Chorus')
    chorus1.lines = [{ ...newLine('Sing it loud'), chords: [placedChord({ root: 'D', quality: 'maj' }, 5)] }]
    const chorus2 = newSection('chorus', 'Chorus 2')
    chorus2.lines = [{ ...newLine('Different words now'), chords: [placedChord({ root: 'A', quality: 'm' }, 0)] }]
    const bridge = newSection('bridge', 'Bridge')
    bridge.lines = [newLine('Bridge line')]
    song.sections.push(chorus1, chorus2, bridge)
    const { container } = render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    const sections = container.querySelectorAll('section')
    expect(within(sections[1]).queryByRole('button', { name: 'Copy chords from first chorus' })).toBeNull()
    expect(within(sections[2]).queryByRole('button', { name: 'Copy chords from first verse' })).toBeNull()
    expect(within(sections[3]).queryByRole('button', { name: /^Copy chords/ })).toBeNull()
    fireEvent.click(within(sections[2]).getByRole('button', { name: 'Copy chords from first chorus' }))
    expect(container.querySelectorAll('section')).toHaveLength(4)
    expect(within(sections[2]).getByDisplayValue('Different words now')).toBeTruthy()
    expect(within(sections[2]).queryByDisplayValue('Sing it loud')).toBeNull()
    expect(within(sections[1]).getByDisplayValue('Sing it loud')).toBeTruthy()
    expect((within(sections[2]).getByRole('textbox', { name: 'Section title' }) as HTMLInputElement).value).toBe('Chorus 2')
    expect(within(sections[2]).queryByRole('button', { name: 'Chord Am' })).toBeNull()
    const copied = within(sections[2]).getByRole('button', { name: 'Chord D' })
    expect(copied.style.left).toBe(`${10 * 8}px`)
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    expect(within(sections[2]).getByRole('button', { name: 'Chord Am' })).toBeTruthy()
    expect(within(sections[2]).queryByRole('button', { name: 'Chord D' })).toBeNull()
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true })
    expect(within(sections[2]).getByRole('button', { name: 'Chord D' })).toBeTruthy()
  })

  it('disables chorus chord copy when the first chorus has no chords', () => {
    const song = newSong()
    const chorus1 = newSection('chorus', 'Chorus')
    chorus1.lines = [newLine('No chords here')]
    const chorus2 = newSection('chorus', 'Chorus 2')
    chorus2.lines = [{ ...newLine('Has chords'), chords: [placedChord({ root: 'C', quality: 'maj' }, 0)] }]
    song.sections.push(chorus1, chorus2)
    render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    expect((screen.getByRole('button', { name: 'Copy chords from first chorus' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('adds suggested sections blank with no clone shortcuts', () => {
    const song = newSong()
    song.sections[0].lines = [newLine('Verse lyrics')]
    song.sections.push(newSection('chorus', 'Chorus'))
    const { container } = render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    expect(screen.queryByRole('button', { name: /like/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '+ Verse 2' }))
    const sections = container.querySelectorAll('section')
    expect(sections).toHaveLength(3)
    const added = sections[2]
    expect((within(added).getByRole('textbox', { name: 'Section title' }) as HTMLInputElement).value).toBe('Verse 2')
    expect((added.querySelector('input.lyric-input') as HTMLInputElement).value).toBe('')
  })

  it('opens the PDF export options dialog', async () => {
    const song = newSong()
    render(
      <SongProvider initial={song}>
        <SongEditor onOpenLibrary={() => {}} />
      </SongProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(await screen.findByRole('dialog', { name: 'PDF export options' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('lazy-loads the editor when a song is opened and returns to the library', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('No songs yet')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '+ New song' }))
    expect(await screen.findByDisplayValue('Untitled Song')).toBeTruthy()
    expect(screen.getByText('Transpose')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open song library' }))
    expect(await screen.findByText('Untitled Song')).toBeTruthy()
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
