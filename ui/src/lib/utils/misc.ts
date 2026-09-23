import type { ReplayGainMode } from '$lib/state/settings.svelte'

const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:', 'ftp:'])

/**
 * Returns undefined for a valid (or empty) URL, otherwise the i18n key of the error. Only network
 * schemes pass: `javascript:`, `data:` and the like parse fine but must never be stored as links.
 */
export const urlValidate = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  try {
    return ALLOWED_URL_PROTOCOLS.has(new URL(value).protocol) ? undefined : 'ra.validation.url'
  } catch {
    return 'ra.validation.url'
  }
}

/** Go serialises an unset time.Time as year 1 */
export function isDateSet(date: unknown): boolean {
  if (!date) return false
  if (typeof date === 'string') return date !== '0001-01-01T00:00:00Z'
  if (date instanceof Date) return date.toISOString() !== '0001-01-01T00:00:00Z'
  return !!date
}

export const intersperse = <T, S>(arr: T[], sep: S): (T | S)[] =>
  arr.flatMap((x, i) => (i === 0 ? [x] : [sep, x]))

interface GainTags {
  rgAlbumGain?: number
  rgAlbumPeak?: number
  rgTrackGain?: number
  rgTrackPeak?: number
}

// https://wiki.hydrogenaud.io/index.php?title=ReplayGain_1.0_specification&section=19
// Normalised so the peak never clips
const replayGain = (preAmp: number, gain?: number, peak?: number): number => {
  if (gain === undefined || gain === null || peak === undefined || peak === null) return 1
  return Math.min(10 ** ((gain + preAmp) / 20), 1 / peak)
}

export const calculateGain = (mode: ReplayGainMode, preAmp: number, song: GainTags): number => {
  switch (mode) {
    case 'album':
      return replayGain(preAmp, song.rgAlbumGain, song.rgAlbumPeak)
    case 'track':
      return replayGain(preAmp, song.rgTrackGain, song.rgTrackPeak)
    default:
      return 1
  }
}

export const sendNotification = (title: string, body = '', image = ''): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: image, silent: true })
}

export const debounce = <A extends unknown[]>(fn: (...args: A) => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const debounced = (...args: A) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}

export const throttle = <A extends unknown[]>(fn: (...args: A) => void, ms: number) => {
  let last = 0
  let trailing: ReturnType<typeof setTimeout> | undefined
  let pending: A | undefined
  return (...args: A) => {
    const now = Date.now()
    const wait = ms - (now - last)
    if (wait <= 0) {
      last = now
      fn(...args)
    } else {
      pending = args
      clearTimeout(trailing)
      trailing = setTimeout(() => {
        last = Date.now()
        fn(...(pending as A))
      }, wait)
    }
  }
}

export const shuffled = <T>(items: readonly T[]): T[] => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Copies text to the clipboard. The async Clipboard API needs a secure context, which a LAN
 * server over plain http isn't, so fall back to a hidden textarea and execCommand.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through
    }
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
  }
}
