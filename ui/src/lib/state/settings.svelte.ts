import { DEFAULT_ACCENT, findAccent, onAccent, type Accent, type Scheme } from '$lib/accents'
import { legacyState, persisted } from './persisted.svelte'

export type ReplayGainMode = 'none' | 'album' | 'track'
export type AlbumView = 'grid' | 'table'

interface Settings {
  /** Read by app.html before the first paint, so keep the name stable */
  colorScheme: Scheme
  accent: string
  albumView: AlbumView
  notifications: boolean
  /** Per list, which optional columns are shown: { song: { bpm: true } } */
  columns: Record<string, Record<string, boolean>>
  perPage: Record<string, number>
  /** Grid or table per list (artists, playlists...); albums use albumView */
  views: Record<string, AlbumView>
  sidebarPlaylistsOnlyFavourites: boolean
  replayGain: ReplayGainMode
  preAmp: number
  /** Route the app opens on, e.g. '/album/recentlyAdded' */
  defaultView: string
  queueOpen: boolean
  sidebarCollapsed: boolean
}

const readLegacyKey = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** First run after upgrading from the React UI: carry its choices over */
const seedFromLegacy = (): Partial<Settings> => {
  const legacy = legacyState()
  const seed: Partial<Settings> = {}
  if (!legacy) return seed
  const albumView = legacy.albumView as { grid?: boolean } | undefined
  if (albumView) seed.albumView = albumView.grid === false ? 'table' : 'grid'
  const s = legacy.settings as
    | {
        notifications?: boolean
        toggleableFields?: Record<string, Record<string, boolean>>
        sidebarPlaylistsOnlyFavourites?: boolean
      }
    | undefined
  if (s?.notifications !== undefined) seed.notifications = s.notifications
  if (s?.toggleableFields) seed.columns = s.toggleableFields
  if (s?.sidebarPlaylistsOnlyFavourites !== undefined)
    seed.sidebarPlaylistsOnlyFavourites = s.sidebarPlaylistsOnlyFavourites
  const gain = readLegacyKey('gainMode')
  if (gain === 'album' || gain === 'track' || gain === 'none') seed.replayGain = gain
  const preAmp = parseFloat(readLegacyKey('preAmp') ?? '')
  if (!isNaN(preAmp)) seed.preAmp = preAmp
  // Legacy stored a bare id: an album list ('recentlyAdded') or a resource ('artist')
  const view = readLegacyKey('defaultView')
  if (view)
    seed.defaultView = ['artist', 'song', 'playlist', 'radio'].includes(view)
      ? `/${view}`
      : `/album/${view}`
  return seed
}

class SettingsState {
  #s = persisted<Settings>(
    'nd-settings',
    {
      colorScheme: 'auto',
      accent: DEFAULT_ACCENT,
      albumView: 'grid',
      notifications: false,
      columns: {},
      perPage: {},
      views: {},
      sidebarPlaylistsOnlyFavourites: false,
      replayGain: 'none',
      preAmp: 0,
      defaultView: '/album/recentlyAdded',
      queueOpen: false,
      sidebarCollapsed: false,
    },
    seedFromLegacy,
  )

  #prefersDark = $state(
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)').matches : true,
  )

  constructor() {
    if (typeof matchMedia === 'function') {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.#prefersDark = e.matches
      })
    }
  }

  get colorScheme(): Scheme {
    return this.#s.colorScheme
  }
  set colorScheme(v: Scheme) {
    this.#s.colorScheme = v
  }

  get accentId() {
    return this.#s.accent
  }
  set accentId(id: string) {
    this.#s.accent = findAccent(id).id
  }

  get accentPreset(): Accent {
    return findAccent(this.#s.accent)
  }

  /** The scheme actually in effect, with "auto" resolved against the OS */
  get isDark(): boolean {
    const scheme = this.#s.colorScheme
    return scheme === 'dark' || (scheme === 'auto' && this.#prefersDark)
  }

  /** The accent colour for the scheme in effect */
  get accent(): string {
    const a = this.accentPreset
    return this.isDark ? a.dark : a.light
  }

  get onAccent(): string {
    return onAccent(this.accentPreset, this.isDark)
  }

  get albumView() {
    return this.#s.albumView
  }
  set albumView(v: AlbumView) {
    this.#s.albumView = v
  }

  get notifications() {
    return this.#s.notifications
  }
  set notifications(v: boolean) {
    this.#s.notifications = v
  }

  get sidebarPlaylistsOnlyFavourites() {
    return this.#s.sidebarPlaylistsOnlyFavourites
  }
  set sidebarPlaylistsOnlyFavourites(v: boolean) {
    this.#s.sidebarPlaylistsOnlyFavourites = v
  }

  get replayGain() {
    return this.#s.replayGain
  }
  set replayGain(v: ReplayGainMode) {
    this.#s.replayGain = v
  }

  get preAmp() {
    return this.#s.preAmp
  }
  set preAmp(v: number) {
    if (!isNaN(v)) this.#s.preAmp = v
  }

  get defaultView() {
    return this.#s.defaultView
  }
  set defaultView(v: string) {
    this.#s.defaultView = v
  }

  get queueOpen() {
    return this.#s.queueOpen
  }
  set queueOpen(v: boolean) {
    this.#s.queueOpen = v
  }

  get sidebarCollapsed() {
    return this.#s.sidebarCollapsed
  }
  set sidebarCollapsed(v: boolean) {
    this.#s.sidebarCollapsed = v
  }

  /** Whether an optional column is visible; `fallback` is its default */
  column(list: string, name: string, fallback = true): boolean {
    return this.#s.columns[list]?.[name] ?? fallback
  }

  setColumn(list: string, name: string, visible: boolean) {
    this.#s.columns[list] = { ...this.#s.columns[list], [name]: visible }
  }

  view(list: string, fallback: AlbumView = 'grid'): AlbumView {
    return this.#s.views[list] ?? fallback
  }

  setView(list: string, view: AlbumView) {
    this.#s.views[list] = view
  }

  perPage(list: string, fallback: number): number {
    return this.#s.perPage[list] ?? fallback
  }

  setPerPage(list: string, value: number) {
    this.#s.perPage[list] = value
  }
}

export const settings = new SettingsState()
