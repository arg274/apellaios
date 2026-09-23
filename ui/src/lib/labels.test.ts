import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Album } from '$lib/api/types'

const getList = vi.fn()
vi.mock('$lib/api/rest', () => ({ getList: (...args: unknown[]) => getList(...args) }))

const { byLatest, byName, findLabel } = await import('./labels')

const album = (over: Partial<Album>): Album =>
  ({
    id: over.name ?? 'x',
    name: 'x',
    albumArtistId: 'ar1',
    albumArtist: 'Artist One',
    minYear: 0,
    maxYear: 0,
    minOriginalYear: 0,
    maxOriginalYear: 0,
    playCount: 0,
    createdAt: '2024-01-01',
    genres: [],
    ...over,
  }) as Album

describe('findLabel', () => {
  beforeEach(() => getList.mockReset())

  it('picks the exact name out of substring matches, ignoring case', async () => {
    getList.mockResolvedValue({
      data: [
        { id: 'a', tagName: 'recordlabel', tagValue: 'Capitol Records Nashville' },
        { id: 'b', tagName: 'recordlabel', tagValue: 'Capitol Records' },
      ],
    })
    expect((await findLabel('capitol records'))?.id).toBe('b')
    expect(getList).toHaveBeenCalledWith('tag', {
      filter: { tag_name: 'recordlabel', name: 'capitol records' },
      perPage: 50,
    })
  })

  it('returns null when only partial matches exist', async () => {
    getList.mockResolvedValue({
      data: [{ id: 'a', tagName: 'recordlabel', tagValue: 'Capitol Records' }],
    })
    expect(await findLabel('Capitol')).toBeNull()
  })
})

describe('ordering', () => {
  const old = album({ name: 'old', maxYear: 1990 })
  const hit = album({ name: 'hit', maxYear: 2000, playCount: 50 })
  const newest = album({ name: 'newest', maxYear: 2020 })
  const undated = album({ name: 'undated', createdAt: '2025-06-01' })

  it('puts the newest release first and undated ones last', () => {
    expect(byLatest([old, undated, hit, newest]).map((a) => a.name)).toEqual([
      'newest',
      'hit',
      'old',
      'undated',
    ])
  })

  it('lists every release A-Z, ignoring case', () => {
    const alpha = album({ name: 'alpha' })
    const bravo = album({ name: 'Bravo' })
    expect(byName([bravo, old, alpha]).map((a) => a.name)).toEqual(['alpha', 'Bravo', 'old'])
  })
})
