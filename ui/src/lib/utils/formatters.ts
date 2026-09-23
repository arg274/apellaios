export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/** Clock-style duration: 03:25, 01:02:03, 2:01:02:03 */
export const formatDuration = (d: number): string => {
  d = Math.round(d)
  const days = Math.floor(d / 86400)
  const hours = Math.floor(d / 3600) % 24
  const minutes = Math.floor(d / 60) % 60
  const seconds = Math.floor(d % 60)
  const f = [hours, minutes, seconds]
    .map((v) => v.toString().padStart(2, '0'))
    .filter((v, i) => v !== '00' || i > 0 || days > 0)
    .join(':')
  return `${days > 0 ? days + ':' : ''}${f}`
}

/** Track-length style duration without a leading zero on minutes: 3:25, 1:02:03 */
export const formatTrackDuration = (d: number | undefined | null): string => {
  if (d == null || !isFinite(d) || d < 0) return '–:––'
  const total = Math.round(d)
  const h = Math.floor(total / 3600)
  const m = Math.floor(total / 60) % 60
  const s = total % 60
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Compact human duration: 1h 2m 3s, 2d 1h 1m (seconds dropped once days appear) */
export const formatDuration2 = (totalSeconds: number | null | undefined): string => {
  if (totalSeconds == null || totalSeconds < 0) return '0s'
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const parts: string[] = []
  if (days > 0) {
    parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
  } else {
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
  }
  return parts.join(' ')
}

/** Nanoseconds to a short duration: <1s, 42s, 3m5s, 1h30m */
export const formatShortDuration = (ns: number): string => {
  const seconds = ns / 1e9
  if (seconds < 1.0) return '<1s'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) return `${hours}h${minutes}m`
  if (minutes > 0) return `${minutes}m${secs}s`
  return `${secs}s`
}

/** Formats partial dates ('2011', '2011-06', '2011-06-01') at their own precision */
export const formatFullDate = (date: string, locale?: string): string => {
  const dashes = date.split('-').length - 1
  if (dashes > 2 || (dashes === 0 && date.length > 4)) return ''
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    timeZone: 'UTC',
    ...(dashes > 0 && { month: 'short' }),
    ...(dashes > 1 && { day: 'numeric' }),
  }
  return new Date(date).toLocaleDateString(locale, options)
}

export const formatDateTime = (value: string | number | Date, locale?: string): string =>
  new Date(value).toLocaleString(locale)

export const formatDate = (value: string | number | Date, locale?: string): string =>
  new Date(value).toLocaleDateString(locale)

export const formatNumber = (value: number | null | undefined, locale?: string): string => {
  if (value === null || value === undefined) return '0'
  return value.toLocaleString(locale)
}
