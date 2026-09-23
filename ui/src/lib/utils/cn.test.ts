import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('keeps a colour and a ramp size together', () => {
    expect(cn('text-label', 'text-title-1')).toBe('text-label text-title-1')
  })
  it('lets later sizes and colours win', () => {
    expect(cn('text-body', 'text-title-2')).toBe('text-title-2')
    expect(cn('text-label', 'text-label-2')).toBe('text-label-2')
  })
})
