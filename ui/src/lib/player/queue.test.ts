import { describe, expect, it } from 'vitest'
import type { PlaylistTrack, Song } from '$lib/api/types'
import {
  insertAfter,
  move,
  nextIndex,
  playable,
  prevIndex,
  removeAt,
  shuffleUpcoming,
  songItem,
  toQueueSong,
  trimForStorage,
  unshuffleUpcoming,
  type QueueItem,
} from './queue'

const song = (id: string, extra: Partial<Song> = {}) => ({ id, title: id, ...extra }) as Song
const queueOf = (...ids: string[]) => ids.map((id) => songItem(song(id)))
const ids = (q: QueueItem[]) => q.map((i) => (i.kind === 'song' ? i.song.id : i.radio.id))

describe('toQueueSong', () => {
  it('uses the media file id for playlist tracks', () => {
    const track = { ...song('3'), mediaFileId: 'mf1', playlistId: 'pl1' } as PlaylistTrack
    const s = toQueueSong(track)
    expect(s.id).toBe('mf1')
    expect(s.playlistId).toBe('pl1')
  })
  it('leaves plain songs alone', () => {
    expect(toQueueSong(song('a')).id).toBe('a')
  })
})

describe('playable', () => {
  it('drops missing files', () => {
    expect(playable([song('a'), song('b', { missing: true })]).map((s) => s.id)).toEqual(['a'])
  })
})

describe('insertAfter', () => {
  it('inserts right after the given index', () => {
    expect(ids(insertAfter(queueOf('a', 'b', 'c'), 0, queueOf('x', 'y')))).toEqual([
      'a',
      'x',
      'y',
      'b',
      'c',
    ])
  })
  it('appends when nothing is playing', () => {
    expect(ids(insertAfter(queueOf(), -1, queueOf('x')))).toEqual(['x'])
  })
})

describe('move', () => {
  it('moves an item and tracks the current one', () => {
    const q = queueOf('a', 'b', 'c', 'd')
    const [next, current] = move(q, 0, 2, 1)
    expect(ids(next)).toEqual(['b', 'c', 'a', 'd'])
    expect(current).toBe(0) // 'b' is still current
  })
  it('follows the current item when it is the one moved', () => {
    const [next, current] = move(queueOf('a', 'b', 'c'), 1, 2, 1)
    expect(ids(next)).toEqual(['a', 'c', 'b'])
    expect(current).toBe(2)
  })
})

describe('removeAt', () => {
  it('shifts the current index past removed items', () => {
    const [next, current] = removeAt(queueOf('a', 'b', 'c', 'd'), [0, 1], 3)
    expect(ids(next)).toEqual(['c', 'd'])
    expect(current).toBe(1)
  })
  it('lands on the next survivor when the current item is removed', () => {
    const [next, current] = removeAt(queueOf('a', 'b', 'c'), [1], 1)
    expect(ids(next)).toEqual(['a', 'c'])
    expect(current).toBe(1)
  })
  it('clamps to the end and empties to -1', () => {
    expect(removeAt(queueOf('a', 'b'), [1], 1)[1]).toBe(0)
    expect(removeAt(queueOf('a'), [0], 0)[1]).toBe(-1)
  })
})

describe('shuffle', () => {
  it('keeps played and current items in place and restores order afterwards', () => {
    const q = queueOf('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h')
    const s = shuffleUpcoming(q, 2)
    expect(ids(s).slice(0, 3)).toEqual(['a', 'b', 'c'])
    expect([...ids(s)].sort()).toEqual(ids(q))
    expect(ids(unshuffleUpcoming(s, 2))).toEqual(ids(q))
  })
})

describe('nextIndex / prevIndex', () => {
  it('stops at the end unless repeating all', () => {
    expect(nextIndex(3, 1, 'off')).toBe(2)
    expect(nextIndex(3, 2, 'off')).toBe(-1)
    expect(nextIndex(3, 2, 'all')).toBe(0)
    expect(nextIndex(0, -1, 'all')).toBe(-1)
  })
  it('wraps backwards only when repeating all', () => {
    expect(prevIndex(3, 0, 'off')).toBe(0)
    expect(prevIndex(3, 0, 'all')).toBe(2)
    expect(prevIndex(3, 2, 'off')).toBe(1)
  })
})

describe('trimForStorage', () => {
  it('drops lyrics and tags', () => {
    const item = songItem(song('a', { lyrics: '[...]', tags: { x: ['y'] } }))
    const trimmed = trimForStorage(item)
    expect(trimmed.kind === 'song' && trimmed.song.lyrics).toBe('')
    expect(trimmed.kind === 'song' && trimmed.song.tags).toBeUndefined()
  })
})
