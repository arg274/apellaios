import type { PlaylistTrack, Radio, Song } from '$lib/api/types'
import { uuid } from '$lib/api/http'
import { shuffled } from '$lib/utils/misc'

/** A song in the queue. Playlist entries are normalised so `id` is the media file id. */
export type QueueSong = Song & { playlistId?: string }

interface Base {
  uuid: string
  /** Insertion order, used to restore the original order when shuffle is turned off */
  seq: number
}

export type QueueItem =
  (Base & { kind: 'song'; song: QueueSong }) | (Base & { kind: 'radio'; radio: Radio })

export type RepeatMode = 'off' | 'all' | 'one'

export const itemId = (item: QueueItem): string =>
  item.kind === 'song' ? item.song.id : item.radio.id

export const isPlaylistTrack = (s: Song | PlaylistTrack): s is PlaylistTrack =>
  'mediaFileId' in s && typeof (s as PlaylistTrack).mediaFileId === 'string'

/** Playlist rows carry their position as `id`; the queue wants the media file id */
export const toQueueSong = (s: Song | PlaylistTrack): QueueSong =>
  isPlaylistTrack(s) ? { ...s, id: s.mediaFileId, playlistId: s.playlistId } : s

let seqCounter = 0

/** Continues numbering after a restored queue, so new items sort after old ones */
export const resumeSeq = (queue: QueueItem[]) => {
  seqCounter = Math.max(seqCounter, ...queue.map((q) => q.seq + 1), 0)
}

export const songItem = (s: Song | PlaylistTrack): QueueItem => ({
  uuid: uuid(),
  seq: seqCounter++,
  kind: 'song',
  song: toQueueSong(s),
})

export const radioItem = (radio: Radio): QueueItem => ({
  uuid: uuid(),
  seq: seqCounter++,
  kind: 'radio',
  radio,
})

/** Missing files can't be streamed, so they never enter the queue */
export const playable = <T extends Song>(songs: T[]): T[] => songs.filter((s) => !s.missing)

export function insertAfter(queue: QueueItem[], index: number, items: QueueItem[]): QueueItem[] {
  const at = Math.min(Math.max(index + 1, 0), queue.length)
  return [...queue.slice(0, at), ...items, ...queue.slice(at)]
}

/** Moves one item, returning the new queue and where the current item ended up */
export function move(
  queue: QueueItem[],
  from: number,
  to: number,
  current: number,
): [QueueItem[], number] {
  if (from === to || from < 0 || from >= queue.length) return [queue, current]
  const next = [...queue]
  const [item] = next.splice(from, 1)
  const target = Math.min(Math.max(to, 0), next.length)
  next.splice(target, 0, item)
  const currentUuid = queue[current]?.uuid
  return [next, currentUuid ? next.findIndex((q) => q.uuid === currentUuid) : current]
}

/** Removes the items at `indices`; the current index follows its item, or the next survivor */
export function removeAt(
  queue: QueueItem[],
  indices: number[],
  current: number,
): [QueueItem[], number] {
  const drop = new Set(indices)
  const next = queue.filter((_, i) => !drop.has(i))
  if (current < 0) return [next, -1]
  if (!drop.has(current)) {
    return [next, current - indices.filter((i) => i < current).length]
  }
  // The playing item was removed: land on whatever now occupies its slot
  const removedBefore = indices.filter((i) => i < current).length
  const idx = current - removedBefore
  return [next, next.length === 0 ? -1 : Math.min(idx, next.length - 1)]
}

/** Shuffles everything after the current item, leaving history and the current track alone */
export function shuffleUpcoming(queue: QueueItem[], current: number): QueueItem[] {
  const head = queue.slice(0, current + 1)
  return [...head, ...shuffled(queue.slice(current + 1))]
}

/** Puts the upcoming items back in insertion order */
export function unshuffleUpcoming(queue: QueueItem[], current: number): QueueItem[] {
  const head = queue.slice(0, current + 1)
  return [...head, ...queue.slice(current + 1).sort((a, b) => a.seq - b.seq)]
}

/** Index to advance to when a track ends or "next" is pressed; -1 means stop */
export function nextIndex(length: number, current: number, repeat: RepeatMode): number {
  if (length === 0) return -1
  if (current + 1 < length) return current + 1
  return repeat === 'all' ? 0 : -1
}

export function prevIndex(length: number, current: number, repeat: RepeatMode): number {
  if (length === 0) return -1
  if (current > 0) return current - 1
  return repeat === 'all' ? length - 1 : 0
}

/** Drops fields that bloat localStorage; the player refetches full details for the current song */
export const trimForStorage = (item: QueueItem): QueueItem => {
  if (item.kind !== 'song') return item
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lyrics, tags, comment, ...song } = item.song
  return { ...item, song: { ...song, lyrics: '' } as QueueSong }
}
