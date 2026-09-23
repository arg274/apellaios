import config from '$lib/config'
import type { Share } from '$lib/api/types'

/** "OPUS 192" style label; a share without a format streams the original files */
export const shareFormat = (s: Pick<Share, 'format' | 'maxBitRate'>): string => {
  const format = s.format || (s.maxBitRate ? config.defaultDownsamplingFormat : '')
  if (!format) return 'Original'
  return [format.toUpperCase(), s.maxBitRate || ''].filter(Boolean).join(' ')
}

/** ISO timestamp to the value a datetime-local input expects, in local time */
export const toLocalInput = (iso: string | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime()) || d.getFullYear() <= 1) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
