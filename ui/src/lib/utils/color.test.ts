import { describe, expect, it } from 'vitest'
import { pageTint, tintAccent, tintIsDark } from './color'

describe('tintIsDark', () => {
  it('forces light text on dark covers only', () => {
    expect(tintIsDark('#101010', false)).toBe(true)
    expect(tintIsDark('#f0e0d0', false)).toBe(false)
    expect(tintIsDark('#f0e0d0', true)).toBe(true)
    expect(tintIsDark(null, false)).toBe(false)
  })
})

describe('pageTint', () => {
  it('uses the colour in light schemes and a deep version in dark ones', () => {
    expect(pageTint('#aeb5c9', false)).toBe('#aeb5c9')
    expect(pageTint('#aeb5c9', true)).toBe('oklch(from #aeb5c9 min(l, 0.3) c h)')
    expect(pageTint('red', false)).toBeNull()
  })
})

describe('tintAccent', () => {
  it('darkens the tint under white text on light pages', () => {
    expect(tintAccent('#b88a55', false)).toEqual({
      accent: 'oklch(from #b88a55 calc(l * 0.45) min(c * 1.5, 0.2) h)',
      onAccent: '#ffffff',
    })
  })

  it('lightens the tint under black text on dark pages', () => {
    expect(tintAccent('#b88a55', true)?.onAccent).toBe('#000000')
  })

  it('has nothing to offer without a tint', () => {
    expect(tintAccent(null, false)).toBeNull()
    expect(tintAccent('#fff', true)).toBeNull()
  })
})
