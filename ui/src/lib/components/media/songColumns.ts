import { MediaQuery } from 'svelte/reactivity'
import config from '$lib/config'

export type ColumnId =
  | 'trackNumber'
  | 'title'
  | 'artist'
  | 'album'
  | 'albumArtist'
  | 'composer'
  | 'year'
  | 'duration'
  | 'playCount'
  | 'playDate'
  | 'quality'
  | 'size'
  | 'channels'
  | 'bpm'
  | 'genre'
  | 'mood'
  | 'rating'
  | 'createdAt'
  | 'bitRate'
  | 'comment'
  | 'path'
  | 'love'

export interface ColumnDef {
  /** i18n key for the header */
  label: string
  /** Server sort field; absent means not sortable */
  sort?: string
  /** <col> width; the title column takes the rest */
  width: string
  align?: 'right' | 'center'
  /** Hidden below this breakpoint regardless of settings */
  minWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export const COLUMNS: Record<ColumnId, ColumnDef> = {
  trackNumber: { label: '#', sort: 'track_number', width: '2.5rem', align: 'center' },
  title: { label: 'resources.song.fields.title', sort: 'title', width: 'auto' },
  artist: { label: 'resources.song.fields.artist', sort: 'artist', width: '22%', minWidth: 'md' },
  album: { label: 'resources.song.fields.album', sort: 'album', width: '22%', minWidth: 'lg' },
  albumArtist: {
    label: 'resources.song.fields.albumArtist',
    sort: 'album_artist',
    width: '18%',
    minWidth: 'lg',
  },
  composer: { label: 'resources.song.fields.composer', width: '16%', minWidth: 'lg' },
  year: { label: 'resources.song.fields.year', sort: 'year', width: '4.5rem', minWidth: 'lg' },
  duration: {
    label: 'resources.song.fields.duration',
    sort: 'duration',
    width: '4.5rem',
    align: 'right',
    minWidth: 'sm',
  },
  playCount: {
    label: 'resources.song.fields.playCount',
    sort: 'play_count',
    width: '5rem',
    align: 'right',
    minWidth: 'lg',
  },
  playDate: {
    label: 'resources.song.fields.playDate',
    sort: 'play_date',
    width: '9rem',
    minWidth: 'xl',
  },
  quality: { label: 'resources.song.fields.quality', width: '7rem', minWidth: 'lg' },
  size: {
    label: 'resources.song.fields.size',
    sort: 'size',
    width: '5.5rem',
    align: 'right',
    minWidth: 'xl',
  },
  channels: {
    label: 'resources.song.fields.channels',
    sort: 'channels',
    width: '5rem',
    align: 'right',
    minWidth: 'xl',
  },
  bpm: {
    label: 'resources.song.fields.bpm',
    sort: 'bpm',
    width: '4rem',
    align: 'right',
    minWidth: 'xl',
  },
  genre: { label: 'resources.song.fields.genre', sort: 'genre', width: '8rem', minWidth: 'xl' },
  mood: { label: 'resources.song.fields.mood', width: '7rem', minWidth: 'xl' },
  rating: { label: 'resources.song.fields.rating', sort: 'rating', width: '6rem', minWidth: 'lg' },
  createdAt: {
    label: 'resources.song.fields.createdAt',
    sort: 'created_at',
    width: '9rem',
    minWidth: 'xl',
  },
  bitRate: {
    label: 'resources.song.fields.bitRate',
    sort: 'bit_rate',
    width: '5.5rem',
    align: 'right',
    minWidth: 'xl',
  },
  comment: { label: 'resources.song.fields.comment', width: '14rem', minWidth: 'xl' },
  path: { label: 'resources.song.fields.path', width: '18rem', minWidth: 'xl' },
  // Hidden on phones, like Apple's track lists there: the title gets the row, and both are in "…"
  love: {
    label: 'resources.song.fields.starred',
    sort: 'starred_at',
    width: '2.5rem',
    align: 'center',
    minWidth: 'sm',
  },
}

/** Columns only available when the feature is enabled on the server */
export const columnEnabled = (id: ColumnId) =>
  (id !== 'rating' || config.enableStarRating) && (id !== 'love' || config.enableFavourites)

type Breakpoint = NonNullable<ColumnDef['minWidth']>

// Tailwind's breakpoints, created on first use (not at import, where tests have no matchMedia)
const MIN_WIDTH: Record<Breakpoint, string> = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
}
const queries: Partial<Record<Breakpoint, MediaQuery>> = {}

/**
 * Whether the screen is wide enough for a column. Narrow screens leave such columns out of the
 * table altogether: hiding a column with display:none leaves its width unassigned in a fixed
 * table, so the title shrank instead of taking the space.
 */
export const columnFits = (id: ColumnId): boolean => {
  const bp = COLUMNS[id].minWidth
  if (!bp) return true
  queries[bp] ??= new MediaQuery(`min-width: ${MIN_WIDTH[bp]}`)
  return queries[bp].current
}
