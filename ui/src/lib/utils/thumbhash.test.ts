import { describe, expect, it } from 'vitest'
import { averageColor, decode, naturalSize } from './thumbhash'

// Digests pinned from evanw/thumbhash's reference decoder (vendored at
// core/artwork/thumbhash/testdata/thumbhash.js), so any drift from it fails here.
const fnv = (bytes: Uint8ClampedArray) => {
  let h = 2166136261 >>> 0
  for (const b of bytes) {
    h ^= b
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16)
}

const REFERENCE: [string, string, number, number, string][] = [
  ['alpha', 'JOiFBQ4nkIexh3p4iA8uB+lYhIeAh3d4dw==', 32, 32, '500141bc'],
  ['landscape', '3wcOFJpwh4eBh3d4iIePgAj3hw==', 32, 18, '18465aed'],
  ['portrait', '3/cNFBqBB4iId4d3d4iAjwj4hw==', 18, 32, '56500cc1'],
  ['solid', 'HoUBBwB4eHeHd3hweId3h3h4B2+Ih4gA', 32, 32, '39cc5c5'],
  ['square', 'H/gNBxpwh4dwd3eIiHd3iHeHeJ+dcH8I', 32, 32, '740d8afc'],
  ['tiny', 'HoU9tx4I9wiIh4hwj3CI+AiIcH/494cP', 32, 32, 'f2555987'],
]

describe('thumbhash decode', () => {
  it.each(REFERENCE)('reproduces the reference pixels for %s', (_name, hash, w, h, digest) => {
    expect(fnv(decode(hash, w, h))).toEqual(digest)
  })

  it.each(REFERENCE)('reports the reference natural size for %s', (_name, hash, w, h) => {
    expect(naturalSize(hash)).toEqual({ width: w, height: h })
  })

  it('carries alpha through for a hash that has it', () => {
    const [, hash, w, h] = REFERENCE[0]
    const pixels = decode(hash, w, h)
    const alphas = new Set<number>()
    for (let i = 3; i < pixels.length; i += 4) alphas.add(pixels[i])
    expect(alphas.size).toBeGreaterThan(1)
  })

  it.each([
    ['empty', ''],
    ['too short to hold a header', 'AAAA'],
    ['not base64', '!!!not-a-thumbhash!!!'],
  ])('throws on a hash that is %s', (_name, hash) => {
    expect(() => decode(hash, 32, 32)).toThrow()
  })
})

describe('averageColor', () => {
  it('matches the mean of the decoded pixels for an opaque image', () => {
    const [, hash] = REFERENCE[3]
    const pixels = decode(hash, 32, 32)
    const mean = [0, 0, 0]
    for (let i = 0; i < pixels.length; i += 4) {
      mean[0] += pixels[i]
      mean[1] += pixels[i + 1]
      mean[2] += pixels[i + 2]
    }
    const n = pixels.length / 4
    const avg = averageColor(hash)
    // The DC term is the true mean of the continuous image; the grid mean lands within a few steps
    avg.forEach((c, i) => expect(Math.abs(c - mean[i] / n)).toBeLessThan(6))
  })
})
