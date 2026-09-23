// Runtime configuration. In a bundled build window.__APP_CONFIG__ is a JSON string rendered
// per request by server/serve_index.go; these defaults only apply under `vite dev`.

export interface AuthInfo {
  id: string
  name: string
  username: string
  isAdmin: boolean
  token?: string
  avatar?: string
  subsonicSalt: string
  subsonicToken: string
}

export interface AppConfig {
  version: string
  firstTime: boolean
  baseURL: string
  variousArtistsId: string
  loginBackgroundURL: string
  maxSidebarPlaylists: number
  enableTranscodingConfig: boolean
  enableDownloads: boolean
  enableFavourites: boolean
  losslessFormats: string
  welcomeMessage: string
  gaTrackingId: string
  devActivityPanel: boolean
  enableStarRating: boolean
  defaultTheme: string
  defaultLanguage: string
  defaultUIVolume: number
  uiSearchDebounceMs: number
  uiCoverArtSize: number
  enableUserEditing: boolean
  enableArtworkUpload: boolean
  enableSharing: boolean
  shareURL: string
  defaultDownloadableShare: boolean
  devSidebarPlaylists: boolean
  lastFMEnabled: boolean
  listenBrainzEnabled: boolean
  enableExternalServices: boolean
  enableCoverAnimation: boolean
  enableNowPlaying: boolean
  playbackReportIntervalMs: number
  devShowArtistPage: boolean
  devUIShowConfig: boolean
  devNewEventStream: boolean
  enableReplayGain: boolean
  enableQuickConnect: boolean
  defaultDownsamplingFormat: string
  publicBaseUrl: string
  separator: string
  enableInspect: boolean
  pluginsEnabled: boolean
  extAuthLogoutURL?: string
  auth?: AuthInfo
}

export interface ShareTrack {
  id: string
  title: string
  artist: string
  album: string
  updatedAt: string
  duration: number
}

export interface ShareInfo {
  id: string
  description: string
  downloadable: boolean
  tracks: ShareTrack[]
}

const defaults: AppConfig = {
  version: 'dev',
  firstTime: false,
  baseURL: '',
  variousArtistsId: '63sqASlAfjbGMuLP4JhnZU', // consts.VariousArtistsID
  loginBackgroundURL: 'https://source.unsplash.com/collection/1065384/1600x900',
  maxSidebarPlaylists: 100,
  enableTranscodingConfig: true,
  enableDownloads: true,
  enableFavourites: true,
  losslessFormats: 'FLAC,WAV,ALAC,DSF',
  welcomeMessage: '',
  gaTrackingId: '',
  devActivityPanel: true,
  enableStarRating: true,
  defaultTheme: 'Auto',
  defaultLanguage: '',
  defaultUIVolume: 100,
  uiSearchDebounceMs: 200,
  uiCoverArtSize: 600,
  enableUserEditing: true,
  enableArtworkUpload: true,
  enableSharing: true,
  shareURL: '',
  defaultDownloadableShare: true,
  devSidebarPlaylists: true,
  lastFMEnabled: true,
  listenBrainzEnabled: true,
  enableExternalServices: true,
  enableCoverAnimation: true,
  enableNowPlaying: true,
  playbackReportIntervalMs: 60000,
  devShowArtistPage: true,
  devUIShowConfig: true,
  devNewEventStream: false,
  enableReplayGain: true,
  enableQuickConnect: false,
  defaultDownsamplingFormat: 'opus',
  publicBaseUrl: '/share',
  separator: '/',
  enableInspect: true,
  pluginsEnabled: true,
}

declare global {
  interface Window {
    __APP_CONFIG__?: string
    __SHARE_INFO__?: string
  }
}

function parseGlobal<T>(raw: string | undefined): T | null {
  if (typeof raw !== 'string' || raw === '') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Under `vite dev` nothing renders the Go template, so ask the backend for its own rendered
 * index (proxied at /__nd_index, see vite.config.ts) and lift the globals out of it. That keeps
 * dev behaviour faithful: firstTime, feature flags, proxy auth and so on. `?share=<id>` loads
 * that share's public page instead, to work on the share player.
 */
async function devGlobals(): Promise<void> {
  const shareId = new URLSearchParams(window.location.search).get('share')
  const readGlobal = (html: string, name: string) => {
    const literal = html.match(
      new RegExp(String.raw`window\.${name}\s*=\s*("(?:[^"\\]|\\.)*")`),
    )?.[1]
    return literal ? (JSON.parse(literal) as string) : undefined
  }
  try {
    const html = await (
      await fetch(shareId ? `/__nd_share/${encodeURIComponent(shareId)}` : '/__nd_index')
    ).text()
    window.__APP_CONFIG__ = readGlobal(html, '__APP_CONFIG__')
    if (shareId) window.__SHARE_INFO__ = readGlobal(html, '__SHARE_INFO__')
  } catch {
    // Fall back to the defaults below
  }
}

if (
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  typeof window.__APP_CONFIG__ !== 'string'
) {
  await devGlobals()
}

const config: AppConfig = {
  ...defaults,
  ...(typeof window !== 'undefined'
    ? parseGlobal<Partial<AppConfig>>(window.__APP_CONFIG__)
    : null),
}

export const shareInfo: ShareInfo | null =
  typeof window !== 'undefined' ? parseGlobal<ShareInfo>(window.__SHARE_INFO__) : null

export default config
