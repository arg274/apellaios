import { describe, expect, it } from 'vitest'
import { activeLineIndex, parseLyrics } from './lyrics'

const synced = JSON.stringify([
  { lang: 'eng', synced: false, line: [{ value: 'plain' }] },
  {
    lang: 'eng',
    synced: true,
    line: [
      { start: 0, value: 'one' },
      { start: 1500, value: 'two' },
      { start: 4000, value: 'three' },
    ],
  },
])

describe('parseLyrics', () => {
  it('prefers the synced set', () => {
    const lyrics = parseLyrics(synced)!
    expect(lyrics.synced).toBe(true)
    expect(lyrics.lines.map((l) => l.value)).toEqual(['one', 'two', 'three'])
    expect(lyrics.lines[1].start).toBe(1500)
  })

  it('falls back to unsynced lyrics without timestamps', () => {
    const lyrics = parseLyrics(
      JSON.stringify([{ synced: false, line: [{ start: 5, value: 'x' }] }]),
    )!
    expect(lyrics.synced).toBe(false)
    expect(lyrics.lines[0].start).toBeUndefined()
  })

  it('returns null for empty or invalid input', () => {
    expect(parseLyrics('')).toBeNull()
    expect(parseLyrics('[]')).toBeNull()
    expect(parseLyrics('{not json')).toBeNull()
  })
})

describe('activeLineIndex', () => {
  const lines = parseLyrics(synced)!.lines
  it('finds the line in progress', () => {
    expect(activeLineIndex(lines, 0)).toBe(0)
    expect(activeLineIndex(lines, 1499)).toBe(0)
    expect(activeLineIndex(lines, 1500)).toBe(1)
    expect(activeLineIndex(lines, 99999)).toBe(2)
  })
  it('is -1 before the first line', () => {
    expect(activeLineIndex([{ start: 1000, value: 'a' }], 10)).toBe(-1)
  })
})
