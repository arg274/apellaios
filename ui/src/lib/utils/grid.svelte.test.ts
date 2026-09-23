import { describe, expect, it } from 'vitest'
import { autoFillColumns, fillRows } from './grid.svelte'

describe('autoFillColumns', () => {
  it('fits as many minimum-width tracks and gaps as the width allows', () => {
    // 7 × 170 + 6 × 20 = 1310
    expect(autoFillColumns(1310, 170, 20)).toBe(7)
    expect(autoFillColumns(1309, 170, 20)).toBe(6)
    expect(autoFillColumns(100, 170, 20)).toBe(1)
  })
})

describe('fillRows', () => {
  it('rounds up to whole rows', () => {
    expect(fillRows(60, 7)).toBe(63)
    expect(fillRows(60, 6)).toBe(60)
    expect(fillRows(30, 8)).toBe(32)
  })

  it('leaves the count alone without a known column count', () => {
    expect(fillRows(60, 0)).toBe(60)
  })
})
