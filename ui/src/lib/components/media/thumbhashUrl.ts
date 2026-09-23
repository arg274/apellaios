import { decode, naturalSize } from '$lib/utils/thumbhash'

const cache = new Map<string, string>()

/** A tiny data: URL rendering of a thumbhash, memoised per hash */
export function thumbhashDataUrl(hash: string | undefined): string | undefined {
  if (!hash) return undefined
  const hit = cache.get(hash)
  if (hit) return hit
  try {
    const { width, height } = naturalSize(hash)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    const image = ctx.createImageData(width, height)
    image.data.set(decode(hash, width, height))
    ctx.putImageData(image, 0, 0)
    const url = canvas.toDataURL()
    if (cache.size > 500) cache.clear()
    cache.set(hash, url)
    return url
  } catch {
    return undefined
  }
}

/** Server-side sizes we ask for, so the image cache is shared across layouts */
const BUCKETS = [64, 128, 256, 300, 600, 1200]

export const sizeBucket = (cssPx: number): number => {
  const px = cssPx * (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)
  return BUCKETS.find((b) => b >= px) ?? BUCKETS[BUCKETS.length - 1]
}
