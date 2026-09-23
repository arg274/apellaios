// Presentation helpers for music records: artist credit links, dates and quality labels
import type { Album, Participant, Participants, Role, Song } from '$lib/api/types'
import config from '$lib/config'
import { calculateGain } from '$lib/utils/misc'
import type { ReplayGainMode } from '$lib/state/settings.svelte'

export type ArtistSegment = { text: string } | { artist: Participant & { subRoles?: string[] } }

/**
 * Splits a display credit ("A feat. B & C") into text and linked-artist segments, finding each
 * participant's name in order. Returns null when no participant name appears in the string.
 */
export function linkDisplayArtist(
  display: string,
  artists: Participant[] = [],
): ArtistSegment[] | null {
  const out: ArtistSegment[] = []
  let last = 0
  for (const artist of artists) {
    const i = display.indexOf(artist.name, last)
    if (i === -1) continue
    if (i > last) out.push({ text: display.slice(last, i) })
    out.push({ artist })
    last = i + artist.name.length
  }
  if (last === 0) return null
  if (last < display.length) out.push({ text: display.slice(last) })
  return out
}

/** Unique participants for a role (first occurrence wins), merging their sub-roles */
export function participantsFor(
  participants: Participants | undefined,
  role: Role,
  limit = Infinity,
) {
  const seen = new Map<string, Participant & { subRoles: string[] }>()
  for (const p of participants?.[role] ?? []) {
    if (!p.id) continue
    const existing = seen.get(p.id)
    if (existing) {
      if (p.subRole && !existing.subRoles.includes(p.subRole)) existing.subRoles.push(p.subRole)
    } else if (seen.size < limit) {
      seen.set(p.id, { ...p, subRoles: p.subRole ? [p.subRole] : [] })
    }
  }
  return [...seen.values()]
}

/**
 * Link segments for a record's main credit (artist for songs, album artist for albums). Uses the
 * display string when it can be matched, so "feat." and joiners survive; otherwise lists the
 * participants; otherwise falls back to the plain name with its id.
 */
export function creditSegments(
  record: Pick<Song, 'participants'> & {
    artist?: string
    artistId?: string
    albumArtist?: string
    albumArtistId?: string
  },
  role: 'artist' | 'albumartist',
): ArtistSegment[] {
  const display = role === 'artist' ? record.artist : record.albumArtist
  const id = role === 'artist' ? record.artistId : record.albumArtistId
  const parts = record.participants?.[role] ?? []
  if (display) {
    const linked = linkDisplayArtist(display, parts)
    if (linked) return linked
  }
  const unique = participantsFor(record.participants, role)
  if (unique.length) {
    return unique.flatMap((artist, i) => (i ? [{ text: ' • ' }, { artist }] : [{ artist }]))
  }
  if (display && id) return [{ artist: { id, name: display } }]
  return display ? [{ text: display }] : []
}

const ORIGINAL = '♫' // ♫
const RELEASE = '○' // ○

const range = (min: number | undefined, max: number | undefined) => {
  if (!max) return ''
  return min && min !== max ? `${min}–${max}` : String(max)
}

/** "2011", "1967–1969", or "♫ 1967 · ○ 2009" when the release is a later reissue */
export function albumYears(
  album: Pick<Album, 'minOriginalYear' | 'maxOriginalYear' | 'minYear' | 'maxYear' | 'releaseDate'>,
): string {
  const releaseYear = album.releaseDate?.slice(0, 4)
  const years =
    range(album.minOriginalYear, album.maxOriginalYear) ||
    (album.maxYear ? String(album.maxYear) : '')
  if (years === '0' || releaseYear?.startsWith('0')) return ''
  if (releaseYear && years && years !== releaseYear)
    return `${ORIGINAL} ${years} · ${RELEASE} ${releaseYear}`
  return years || releaseYear || ''
}

const LOSSLESS = new Set(config.losslessFormats.split(',').map((s) => s.trim().toUpperCase()))

export interface QualityOptions {
  gainMode?: ReplayGainMode
  preAmp?: number
  /** When the server transcodes, the stream actually delivered */
  transcode?: { codec?: string; audioBitrate?: number } | null
}

/** "FLAC", "MP3 320", "FLAC → OPUS 128", with the applied ReplayGain appended in dB */
export function qualityLabel(
  song: Pick<
    Song,
    'suffix' | 'bitRate' | 'rgAlbumGain' | 'rgAlbumPeak' | 'rgTrackGain' | 'rgTrackPeak'
  >,
  opts: QualityOptions = {},
): string {
  const suffix = (song.suffix ?? '').toUpperCase()
  let info = suffix || '–'
  if (suffix && !LOSSLESS.has(suffix) && song.bitRate > 0) info += ` ${song.bitRate}`
  if (opts.transcode) {
    const codec = (opts.transcode.codec ?? '').toUpperCase()
    const kbps = opts.transcode.audioBitrate ? Math.round(opts.transcode.audioBitrate / 1000) : 0
    info = `${suffix || '–'} → ${codec}${kbps ? ' ' + kbps : ''}`
  }
  if (opts.gainMode && opts.gainMode !== 'none') {
    const gain = calculateGain(opts.gainMode, opts.preAmp ?? 0, song)
    info += ` (${(Math.log10(gain) * 20).toFixed(2)} dB)`
  }
  return info
}

/** Hi-res marker: more than CD resolution */
export const isHiRes = (song: Pick<Song, 'bitDepth' | 'sampleRate'>) =>
  (song.bitDepth ?? 0) > 16 || (song.sampleRate ?? 0) > 48000

export const isLossless = (suffix: string | undefined) => LOSSLESS.has((suffix ?? '').toUpperCase())

/** Songs grouped by disc, keeping track order; one group when the album has a single disc */
export function groupByDisc<T extends Pick<Song, 'discNumber' | 'discSubtitle'>>(songs: T[]) {
  const groups: { disc: number; subtitle?: string; songs: T[] }[] = []
  for (const s of songs) {
    const last = groups[groups.length - 1]
    if (last && last.disc === s.discNumber) last.songs.push(s)
    else groups.push({ disc: s.discNumber, subtitle: s.discSubtitle, songs: [s] })
  }
  return groups
}

const RELEASE_TYPE_ACRONYMS = new Set(['ep', 'lp', 'dj-mix'])

/** MusicBrainz release types for display: "ep" -> "EP", "single" -> "Single", "dj-mix" -> "DJ-Mix" */
export const releaseTypeLabel = (type: string | undefined): string => {
  if (!type) return ''
  return type
    .split(/[;,/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      RELEASE_TYPE_ACRONYMS.has(part.toLowerCase())
        ? part.toUpperCase().replace('DJ-MIX', 'DJ-Mix')
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(' · ')
}
