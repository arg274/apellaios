import { describe, expect, it } from 'vitest'
import { mergeLoaded } from './data.svelte'

const block = (start: number, length: number, over: { key?: string; version?: number } = {}) => ({
  key: over.key ?? 'q',
  version: over.version ?? 0,
  start,
  rows: Array.from({ length }, (_, i) => `${over.key ?? 'q'}${start + i}`),
  total: 356,
})

describe('mergeLoaded', () => {
  it('merges overlapping pages into one block', () => {
    // page 2 at 63 per page, then the same page at 60
    const merged = mergeLoaded(block(63, 63), block(60, 60))
    expect(merged.start).toBe(60)
    expect(merged.rows).toHaveLength(66)
    expect(merged.rows[0]).toBe('q60')
    expect(merged.rows.at(-1)).toBe('q125')
  })

  it('merges adjoining pages', () => {
    const merged = mergeLoaded(block(0, 63), block(63, 63))
    expect(merged.start).toBe(0)
    expect(merged.rows).toHaveLength(126)
  })

  it('starts afresh on a gap, another query or a reload', () => {
    expect(mergeLoaded(block(0, 60), block(120, 60)).start).toBe(120)
    expect(mergeLoaded(block(0, 60), block(60, 60, { key: 'other' })).rows[0]).toBe('other60')
    expect(mergeLoaded(block(0, 60), block(60, 60, { version: 1 })).start).toBe(60)
    expect(mergeLoaded(null, block(0, 60)).rows).toHaveLength(60)
  })
})
