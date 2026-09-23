// Drag and drop of music onto playlists (sidebar, playlist pages). The payload is the same shape
// the "add tracks" endpoint takes, carried in a private MIME type so text drops elsewhere and
// drags from other apps are ignored.
import type { PlaylistAddition } from '$lib/api/native'
import type { Playlist } from '$lib/api/types'
import { session } from '$lib/api/session'

const MIME = 'application/x-navidrome-music'

export type DragPayload = PlaylistAddition & { label?: string }

/** ondragstart handler factory for a draggable song, album, disc or artist */
export const dragMusic = (payload: DragPayload) => (e: DragEvent) => {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(MIME, JSON.stringify(payload))
  if (payload.label) e.dataTransfer.setData('text/plain', payload.label)
}

/** Whether a drag carries music (the payload itself is only readable on drop) */
export const isMusicDrag = (e: DragEvent): boolean => !!e.dataTransfer?.types.includes(MIME)

export const readMusicDrop = (e: DragEvent): DragPayload | null => {
  const raw = e.dataTransfer?.getData(MIME)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DragPayload
  } catch {
    return null
  }
}

export const isWritable = (ownerId: string) => session.userId === ownerId || session.isAdmin

export const isSmartPlaylist = (pls: Pick<Playlist, 'rules'>) => !!pls.rules

/** Owned (or admin), not smart, not synced from a file: the only playlists tracks can be added to */
export const canChangeTracks = (pls: Pick<Playlist, 'ownerId' | 'rules' | 'sync'>) =>
  isWritable(pls.ownerId) && !isSmartPlaylist(pls) && !pls.sync
