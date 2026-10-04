import { beforeEach, describe, expect, it, vi } from 'vitest'
import { removeSong, saveSong, syncAll } from './sync'
import { deleteSong, putSong } from './storage'
import { removeCloudSong, saveCloudSong, syncCloudSongs } from './cloudSync'
import { newSong } from './song'

const firebaseMock = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  enabled: true,
}))

vi.mock('./firebase', () => ({
  get firebaseEnabled() {
    return firebaseMock.enabled
  },
  currentUser: () => firebaseMock.user,
}))

vi.mock('./storage', () => ({
  putSong: vi.fn(async () => 'id'),
  deleteSong: vi.fn(async () => undefined),
  listSongs: vi.fn(async () => []),
}))

vi.mock('./cloudSync', () => ({
  saveCloudSong: vi.fn(async () => undefined),
  removeCloudSong: vi.fn(async () => undefined),
  syncCloudSongs: vi.fn(async () => ({ pulled: 1, pushed: 2, removed: 0 })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  firebaseMock.user = null
  firebaseMock.enabled = true
})

describe('saveSong', () => {
  it('writes locally only when signed out', async () => {
    const song = newSong()
    await saveSong(song)
    expect(putSong).toHaveBeenCalledWith(song)
    expect(saveCloudSong).not.toHaveBeenCalled()
  })

  it('writes locally and to the cloud when signed in', async () => {
    firebaseMock.user = { uid: 'u1' }
    const song = newSong()
    await saveSong(song)
    expect(putSong).toHaveBeenCalledWith(song)
    expect(saveCloudSong).toHaveBeenCalledWith(song)
  })

  it('swallows cloud errors and warns', async () => {
    firebaseMock.user = { uid: 'u1' }
    vi.mocked(saveCloudSong).mockRejectedValueOnce(new Error('boom'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(saveSong(newSong())).resolves.toBeUndefined()
    expect(putSong).toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('cloud save failed', expect.any(Error))
    warn.mockRestore()
  })
})

describe('removeSong', () => {
  it('deletes locally only when signed out', async () => {
    await removeSong('s1')
    expect(deleteSong).toHaveBeenCalledWith('s1')
    expect(removeCloudSong).not.toHaveBeenCalled()
  })

  it('deletes locally and from the cloud when signed in', async () => {
    firebaseMock.user = { uid: 'u1' }
    await removeSong('s1')
    expect(deleteSong).toHaveBeenCalledWith('s1')
    expect(removeCloudSong).toHaveBeenCalledWith('s1')
  })

  it('swallows cloud errors and warns', async () => {
    firebaseMock.user = { uid: 'u1' }
    vi.mocked(removeCloudSong).mockRejectedValueOnce(new Error('boom'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(removeSong('s1')).resolves.toBeUndefined()
    expect(deleteSong).toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('cloud delete failed', expect.any(Error))
    warn.mockRestore()
  })
})

describe('syncAll', () => {
  const none = { pulled: 0, pushed: 0, removed: 0 }

  it('returns zeros when signed out', async () => {
    expect(await syncAll()).toEqual(none)
    expect(syncCloudSongs).not.toHaveBeenCalled()
  })

  it('returns zeros when firebase is not configured', async () => {
    firebaseMock.enabled = false
    firebaseMock.user = { uid: 'u1' }
    expect(await syncAll()).toEqual(none)
    expect(syncCloudSongs).not.toHaveBeenCalled()
  })

  it('forwards cloud counts when signed in', async () => {
    firebaseMock.user = { uid: 'u1' }
    vi.mocked(syncCloudSongs).mockResolvedValueOnce({ pulled: 3, pushed: 1, removed: 2 })
    expect(await syncAll()).toEqual({ pulled: 3, pushed: 1, removed: 2 })
    expect(syncCloudSongs).toHaveBeenCalledTimes(1)
  })

  it('propagates cloud errors', async () => {
    firebaseMock.user = { uid: 'u1' }
    vi.mocked(syncCloudSongs).mockRejectedValueOnce(new Error('nope'))
    await expect(syncAll()).rejects.toThrow('nope')
  })
})
