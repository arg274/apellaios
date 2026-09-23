// Subsonic API (/rest) helpers: URL building with the salted-token credentials the server
// hands out at login, plus the handful of calls the web UI makes through it.
import { baseUrl } from '$lib/utils/urls'
import { CLIENT_ID_HEADER, clientUniqueId, http } from './http'
import { session } from './session'
import type { ItemImage } from './types'

type Params = Record<string, string | number | boolean | (string | number)[] | undefined>

/** Builds a /rest/<command> path (without the BasePath); empty when logged out */
export function url(command: string, id?: string | null, params: Params = {}): string {
  const username = session.username
  const token = session.subsonicToken
  const salt = session.subsonicSalt
  if (!username || !token || !salt) return ''
  const q = new URLSearchParams({
    u: username,
    t: token,
    s: salt,
    f: 'json',
    v: '1.8.0',
    c: 'NavidromeUI',
  })
  if (id) q.append('id', id)
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue
    if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)))
    else q.append(k, String(v))
  }
  return `/rest/${command}?${q}`
}

interface SubsonicEnvelope<T> {
  'subsonic-response': T & { status: 'ok' | 'failed'; error?: { code: number; message: string } }
}

export class SubsonicError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'SubsonicError'
  }
}

async function call<T>(command: string, id?: string | null, params?: Params): Promise<T> {
  const res = await http<SubsonicEnvelope<T>>(url(command, id, params))
  const body = res.json['subsonic-response']
  if (body.status !== 'ok') {
    throw new SubsonicError(body.error?.code ?? 0, body.error?.message ?? 'Subsonic error')
  }
  return body
}

export type PlaybackState = 'starting' | 'playing' | 'paused' | 'stopped'

const reportPlaybackUrl = (mediaId: string, positionMs: number, state: PlaybackState) =>
  url('reportPlayback', null, { mediaId, mediaType: 'song', positionMs, state })

export const reportPlayback = (mediaId: string, positionMs: number, state: PlaybackState) =>
  call('reportPlayback', null, { mediaId, mediaType: 'song', positionMs, state }).catch(() => {})

/** Survives page unload, for the final "stopped" report when the tab closes */
export const reportPlaybackKeepalive = (
  mediaId: string,
  positionMs: number,
  state: PlaybackState,
) => {
  const u = reportPlaybackUrl(mediaId, positionMs, state)
  if (u) fetch(baseUrl(u), { keepalive: true, headers: { [CLIENT_ID_HEADER]: clientUniqueId } })
}

export const star = (id: string | string[]) =>
  call('star', null, { id: Array.isArray(id) ? id : [id] })
export const unstar = (id: string | string[]) =>
  call('unstar', null, { id: Array.isArray(id) ? id : [id] })
export const setRating = (id: string, rating: number) => call('setRating', id, { rating })

export const download = (id: string, format = 'raw', bitrate = '0') => {
  window.location.href = baseUrl(url('download', id, { format, bitrate }))
}

export interface ScanStatus {
  scanning: boolean
  count: number
  folderCount: number
  lastScan?: string
  error?: string
  scanType?: string
  elapsedTime?: number
}

export const startScan = (options: { fullScan?: boolean; target?: string[] } = {}) =>
  call<{ scanStatus: ScanStatus }>('startScan', null, {
    ...(options.fullScan !== undefined && { fullScan: options.fullScan }),
    ...(options.target && { target: options.target }),
  })

export const getScanStatus = () => call<{ scanStatus: ScanStatus }>('getScanStatus')

export interface NowPlayingEntry {
  id: string
  title: string
  artist: string
  album: string
  albumId: string
  coverArt?: string
  username: string
  playerName: string
  playerId: number
  minutesAgo: number
  artistId?: string
  albumArtist?: string
  albumArtistId?: string
  /** seconds */
  duration?: number
  /** 'starting' | 'playing' | 'paused' */
  state?: string
  positionMs?: number
  playbackRate?: number
  [key: string]: unknown
}

export const getNowPlaying = () =>
  call<{ nowPlaying: { entry?: NowPlayingEntry[] } }>('getNowPlaying').then(
    (r) => r.nowPlaying?.entry ?? [],
  )

export const getAvatarUrl = (username: string, size?: number) =>
  baseUrl(url('getAvatar', null, { username, ...(size && { size }) }))

/** What kind of entity a cover art id refers to */
export type ArtKind = 'album' | 'song' | 'playlist' | 'radio' | 'artist'

const ART_PREFIX: Record<ArtKind, string> = {
  album: 'al',
  song: 'mf',
  playlist: 'pl',
  radio: 'ra',
  artist: 'ar',
}

export interface ArtRef extends ItemImage {
  id: string
  updatedAt?: string
}

/**
 * Cover art URL. A hash-suffixed id is content-addressed, so it is served immutable and must not
 * carry a cache buster; without a hash, updatedAt busts stale copies.
 */
export const coverArtUrl = (
  kind: ArtKind,
  ref: ArtRef,
  size?: number,
  square?: boolean,
): string => {
  const suffix = ref.imageHash ? '_' + ref.imageHash : ''
  return baseUrl(
    url('getCoverArt', `${ART_PREFIX[kind]}-${ref.id}${suffix}`, {
      ...(!ref.imageHash && ref.updatedAt && { _: ref.updatedAt }),
      ...(size && { size }),
      ...(square && { square }),
    }),
  )
}

export const discCoverArtUrl = (
  albumId: string,
  discNumber: number,
  updatedAt?: string,
  size?: number,
) =>
  baseUrl(
    url('getCoverArt', `dc-${albumId}:${discNumber}`, {
      ...(updatedAt && { _: updatedAt }),
      ...(size && { size }),
    }),
  )

export const streamUrl = (id: string, params: Params = {}) =>
  baseUrl(url('stream', id, { _: Date.now(), ...params }))

export const getArtistInfo = (id: string) =>
  call<{
    artistInfo: {
      biography?: string
      musicBrainzId?: string
      lastFmUrl?: string
      smallImageUrl?: string
      mediumImageUrl?: string
      largeImageUrl?: string
      similarArtist?: { id: string; name: string; albumCount?: number; coverArt?: string }[]
    }
  }>('getArtistInfo', id).then((r) => r.artistInfo ?? {})

export const getAlbumInfo = (id: string) =>
  call<{
    albumInfo: {
      notes?: string
      musicBrainzId?: string
      lastFmUrl?: string
      smallImageUrl?: string
      mediumImageUrl?: string
      largeImageUrl?: string
    }
  }>('getAlbumInfo', id).then((r) => r.albumInfo ?? {})

interface SubsonicSong {
  id: string
  [key: string]: unknown
}

export const getSimilarSongs2 = (id: string, count = 100) =>
  call<{ similarSongs2: { song?: SubsonicSong[] } }>('getSimilarSongs2', id, { count }).then(
    (r) => r.similarSongs2?.song ?? [],
  )

export const getTopSongs = (artist: string, count = 50) =>
  call<{ topSongs: { song?: SubsonicSong[] } }>('getTopSongs', null, { artist, count }).then(
    (r) => r.topSongs?.song ?? [],
  )

export interface TranscodeDecision {
  canDirectPlay: boolean
  canTranscode?: boolean
  transcodeParams?: string
  transcodeStream?: {
    protocol?: string
    container?: string
    codec?: string
    audioChannels?: number
    audioBitrate?: number
    audioSamplerate?: number
    audioBitdepth?: number
  }
  [key: string]: unknown
}

export const getTranscodeDecision = async (songId: string, profile: unknown) => {
  const res = await http<SubsonicEnvelope<{ transcodeDecision: TranscodeDecision }>>(
    url('getTranscodeDecision', null, { mediaId: songId, mediaType: 'song' }),
    { method: 'POST', body: profile as object },
  )
  const body = res.json['subsonic-response']
  if (body.status !== 'ok') {
    throw new SubsonicError(
      body.error?.code ?? 0,
      body.error?.message ?? 'getTranscodeDecision error',
    )
  }
  return body.transcodeDecision
}

export const transcodeStreamUrl = (songId: string, transcodeParams: string, offset?: number) =>
  baseUrl(
    url('getTranscodeStream', null, {
      mediaId: songId,
      mediaType: 'song',
      transcodeParams,
      ...(offset && offset > 0 && { offset }),
    }),
  )
