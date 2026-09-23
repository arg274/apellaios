import { describe, expect, it } from 'vitest'
import { barRuns, checkDigit, encodeBarcode } from './barcode'

describe('checkDigit', () => {
  it('matches known codes', () => {
    expect(checkDigit('400638133393')).toBe(1) // EAN-13 4006381333931
    expect(checkDigit('03600029145')).toBe(2) // UPC-A 036000291452
    expect(checkDigit('9638507')).toBe(4) // EAN-8 96385074
  })
})

describe('encodeBarcode', () => {
  it('encodes EAN-13 with the reference pattern', () => {
    const code = encodeBarcode('4006381333931')
    expect(code.format).toBe('ean13')
    expect(code.modules).toHaveLength(95)
    // start guard, then "0" with parity L (first digit 4 = LGLLGG), then "0" with parity G
    expect(code.modules.slice(0, 17)).toBe('101' + '0001101' + '0100111')
    expect(code.modules.slice(45, 50)).toBe('01010')
    expect(code.modules.slice(-3)).toBe('101')
  })

  it('adds a missing check digit', () => {
    expect(encodeBarcode('400638133393').digits).toBe('4006381333931')
    expect(encodeBarcode('9638507').digits).toBe('96385074')
  })

  it('rejects a wrong check digit and non-numeric input', () => {
    expect(() => encodeBarcode('4006381333932')).toThrow(/check digit/)
    expect(() => encodeBarcode('ABC123')).toThrow(/numeric/)
    expect(() => encodeBarcode('12345')).toThrow(/length/)
  })

  it('ignores spaces and dashes', () => {
    expect(encodeBarcode('4 006381 333931').digits).toBe('4006381333931')
    expect(encodeBarcode('9638-5074').digits).toBe('96385074')
  })

  it('draws UPC-A as EAN-13 with a leading 0, keeping its own digits and tall outer bars', () => {
    const upc = encodeBarcode('036000291452', 'upca')
    const ean = encodeBarcode('0036000291452')
    expect(upc.modules).toBe(ean.modules)
    expect(upc.digits).toBe('036000291452')
    expect(upc.guard.slice(3, 10).every(Boolean)).toBe(true)
    expect(ean.guard.slice(3, 10).some(Boolean)).toBe(false)
    expect(upc.text.map((t) => t.digit).join('')).toBe('036000291452')
  })

  it('encodes EAN-8 in 67 modules', () => {
    const code = encodeBarcode('96385074')
    expect(code.modules).toHaveLength(67)
    expect(code.text.map((t) => t.digit).join('')).toBe('96385074')
  })
})

describe('barRuns', () => {
  it('merges adjacent bar modules and keeps guards separate', () => {
    const runs = barRuns(encodeBarcode('4006381333931'))
    expect(runs[0]).toEqual({ start: 0, width: 1, guard: true })
    expect(runs[1]).toEqual({ start: 2, width: 1, guard: true })
    // first data digit "0" (L) = 0001101: a 2-wide bar at 6 and a 1-wide bar at 9
    expect(runs[2]).toEqual({ start: 6, width: 2, guard: false })
    expect(runs[3]).toEqual({ start: 9, width: 1, guard: false })
    const barModules = runs.reduce((n, r) => n + r.width, 0)
    expect(barModules).toBe(
      [...encodeBarcode('4006381333931').modules].filter((m) => m === '1').length,
    )
  })
})
