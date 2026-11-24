import type { Song } from '../types'

/** What to do with a song that arrived from the cloud, given the local copy. */
export function planRemoteChange(local: Song | undefined, remote: Song): 'pull' | 'ignore' {
  if (!local) return 'pull'
  return remote.updatedAt > local.updatedAt ? 'pull' : 'ignore'
}

/** Compare everything except timestamps. */
export function sameContent(a: Song, b: Song): boolean {
  const strip = ({ updatedAt: _u, ...rest }: Song) => rest
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
}

/**
 * Should the open editor offer to load a version that arrived from the cloud?
 * Only when it's newer than what's on screen and actually different.
 */
export function isRemoteConflict(open: Song, remote: Song): boolean {
  return remote.id === open.id && remote.updatedAt > open.updatedAt && !sameContent(open, remote)
}
