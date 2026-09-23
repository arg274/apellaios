import { describe, expect, it } from 'vitest'
import { calculateGain, intersperse, isDateSet, shuffled, urlValidate } from './misc'

describe('urlValidate', () => {
  it('accepts valid and empty URLs', () => {
    expect(urlValidate('https://example.com')).toBeUndefined()
    expect(urlValidate('ftp://files.example.com')).toBeUndefined()
    expect(urlValidate('')).toBeUndefined()
    expect(urlValidate(null)).toBeUndefined()
  })
  it('rejects invalid URLs', () => {
    expect(urlValidate('not-a-url')).toEqual('ra.validation.url')
    expect(urlValidate('example.com')).toEqual('ra.validation.url')
  })
})

describe('isDateSet', () => {
  it('treats Go zero dates and falsy values as unset', () => {
    expect(isDateSet(null)).toBe(false)
    expect(isDateSet('')).toBe(false)
    expect(isDateSet('0001-01-01T00:00:00Z')).toBe(false)
  })
  it('accepts real dates', () => {
    expect(isDateSet('2024-01-15T10:30:00Z')).toBe(true)
    expect(isDateSet(new Date())).toBe(true)
  })
})

describe('intersperse', () => {
  it('places the separator between elements', () => {
    expect(intersperse([1, 2, 3], 0)).toEqual([1, 0, 2, 0, 3])
    expect(intersperse([], 0)).toEqual([])
  })
})

describe('calculateGain', () => {
  const song = { rgAlbumGain: -6, rgAlbumPeak: 0.9, rgTrackGain: 3, rgTrackPeak: 0.95 }
  it('uses the tags of the selected mode', () => {
    expect(calculateGain('album', 0, song)).toBeCloseTo(10 ** (-6 / 20))
    // Track gain is capped so the peak does not clip
    expect(calculateGain('track', 0, song)).toBeCloseTo(1 / 0.95)
  })
  it('is unity when disabled or tags are missing', () => {
    expect(calculateGain('none', 0, song)).toBe(1)
    expect(calculateGain('album', 0, {})).toBe(1)
  })
})

describe('shuffled', () => {
  it('keeps every element and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffled(input)
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})
