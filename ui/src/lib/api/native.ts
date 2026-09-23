// Native API endpoints that fall outside the generic CRUD shape of rest.ts
import { http } from './http'
import { REST_URL, create, getOne, toQuery, update } from './rest'
import { session } from './session'
import type { Playlist, User } from './types'

/** Body for adding tracks to a playlist: any mix of song, album, artist ids or disc refs */
export interface PlaylistAddition {
  ids?: string[]
  albumIds?: string[]
  artistIds?: string[]
  discs?: { albumId: string; releaseDate: string; discNumber: number }[]
}

export const addToPlaylist = async (playlistId: string, data: PlaylistAddition) =>
  (
    await http<{ added: number }>(`${REST_URL}/playlist/${playlistId}/tracks`, {
      method: 'POST',
      body: data,
    })
  ).json

/** Media file ids already in a playlist (used to warn about duplicates) */
export const getPlaylistTrackIds = async (playlistId: string): Promise<string[]> => {
  const res = await http<{ mediaFileId: string }[]>(`${REST_URL}/playlist/${playlistId}/tracks`)
  return (res.json ?? []).map((t) => t.mediaFileId)
}

export const reorderPlaylistTrack = (playlistId: string, trackId: string, insertBefore: number) =>
  http(`${REST_URL}/playlist/${playlistId}/tracks/${trackId}`, {
    method: 'PUT',
    body: { insert_before: String(insertBefore) },
  })

/** Playlists containing the given song */
export const getSongPlaylists = async (songId: string) =>
  (await http<Playlist[]>(`${REST_URL}/song/${songId}/playlists`)).json ?? []

export type ImageEntity = 'album' | 'artist' | 'playlist' | 'radio'

export const uploadImage = (entity: ImageEntity, id: string, file: File) => {
  const body = new FormData()
  body.append('image', file)
  return http(`${REST_URL}/${entity}/${id}/image`, { method: 'POST', body })
}

export const deleteImage = (entity: ImageEntity, id: string) =>
  http(`${REST_URL}/${entity}/${id}/image`, { method: 'DELETE' })

const REFRESH_KIND = { album: 'al', artist: 'ar' } as const

/** Asks the server to re-fetch external metadata; answers 204 */
export const refreshMetadata = (resource: keyof typeof REFRESH_KIND, id: string) =>
  http(`${REST_URL}/metadata/${REFRESH_KIND[resource]}/${id}/refresh`, { method: 'POST' })

export interface InspectResult {
  file: string
  rawTags: Record<string, string[]>
  mappedTags: Record<string, unknown>
}

export const inspect = async (songId: string) =>
  (await http<InspectResult>(`${REST_URL}/inspect${toQuery({ id: songId })}`)).json

/** Tells the server the session is still alive after a track ends (keeps scrobbling sessions) */
export const keepalive = (id: string) => http(`${REST_URL}/keepalive/${id}`).catch(() => undefined)

export const getServerConfig = async () =>
  (await http<{ id: string; config: Record<string, unknown> }>(`${REST_URL}/config/config`)).json

export const getInsights = async () =>
  (
    await http<{ id: string; lastRun: string; success: boolean }>(
      `${REST_URL}/insights/insights_status`,
    )
  ).json

export interface QuickConnectInfo {
  appName?: string
  appVersion?: string
  deviceName?: string
  [key: string]: unknown
}

export const lookupQuickConnect = async (code: string) =>
  (await http<QuickConnectInfo>(`${REST_URL}/quickconnect${toQuery({ code })}`)).json

export const authorizeQuickConnect = async (code: string) =>
  (
    await http<QuickConnectInfo>(`${REST_URL}/quickconnect/authorize`, {
      method: 'POST',
      body: { code },
    })
  ).json

// Scrobbler account links
export const lastfm = {
  status: async () =>
    (
      await http<{ status: boolean; apiKey?: string; linkToken?: string }>(
        `${REST_URL}/lastfm/link`,
      )
    ).json,
  unlink: () => http(`${REST_URL}/lastfm/link`, { method: 'DELETE' }),
}

export const listenbrainz = {
  status: async () =>
    (await http<{ status: boolean; user?: string }>(`${REST_URL}/listenbrainz/link`)).json,
  link: async (token: string) =>
    (
      await http<{ status: boolean; user?: string }>(`${REST_URL}/listenbrainz/link`, {
        method: 'PUT',
        body: { token },
      })
    ).json,
  unlink: () => http(`${REST_URL}/listenbrainz/link`, { method: 'DELETE' }),
}

export const rescanPlugins = () => http(`${REST_URL}/plugin/rescan`, { method: 'POST' })

/** Admin-only: which libraries a (non-admin) user may access */
const setUserLibraries = (userId: string, libraryIds: number[]) =>
  http(`${REST_URL}/user/${userId}/library`, { method: 'PUT', body: { libraryIds } })

export type UserInput = Partial<User> & { libraryIds?: number[] }

export const createUser = async ({ libraryIds, ...data }: UserInput) => {
  const user = await create('user', data)
  if (!data.isAdmin && libraryIds && libraryIds.length > 0) {
    await setUserLibraries(user.id, libraryIds)
  }
  return user
}

export const updateUser = async (id: string, { libraryIds, ...data }: UserInput) => {
  const user = await update('user', id, data)
  // Only admins may call the library endpoint; for self-edits the server keeps assignments
  if (session.isAdmin && !data.isAdmin && libraryIds !== undefined) {
    await setUserLibraries(id, libraryIds)
  }
  return user
}

export const getUser = async (id: string) => {
  const user = await getOne('user', id)
  return { ...user, libraryIds: user.libraries?.map((l) => l.id) ?? [] }
}

/** Downloads a playlist as an .m3u file (the tracks endpoint serves M3U when asked for it) */
export const exportPlaylistM3U = async (playlistId: string, name: string) => {
  const res = await http<string>(`${REST_URL}/playlist/${playlistId}/tracks`, {
    headers: { Accept: 'audio/x-mpegurl' },
  })
  const blob = new Blob([String(res.json ?? '')], { type: 'audio/x-mpegurl' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.m3u`
  link.click()
  URL.revokeObjectURL(url)
}
