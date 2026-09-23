// Splits an artist's albums into Apple-style discography shelves using MusicBrainz release types
// (the releasetype tag carries the primary type plus any secondary types).
import { getList } from '$lib/api/rest'
import type { Album } from '$lib/api/types'

export type ShelfKind =
  | 'albums'
  | 'eps'
  | 'singles'
  | 'live'
  | 'compilations'
  | 'soundtracks'
  | 'remixes'
  | 'other'
  | 'appearsOn'

export const SHELF_ORDER: ShelfKind[] = [
  'albums',
  'eps',
  'singles',
  'live',
  'compilations',
  'soundtracks',
  'remixes',
  'other',
  'appearsOn',
]

/** i18n key of each shelf's title */
export const SHELF_TITLE: Record<ShelfKind, string> = {
  albums: 'ui.discography.albums',
  eps: 'ui.discography.eps',
  singles: 'ui.discography.singles',
  live: 'ui.discography.live',
  compilations: 'ui.discography.compilations',
  soundtracks: 'ui.discography.soundtracks',
  remixes: 'ui.discography.remixes',
  other: 'ui.discography.other',
  appearsOn: 'ui.appearsOn',
}

export const isShelfKind = (value: string | undefined): value is ShelfKind =>
  SHELF_ORDER.includes(value as ShelfKind)

/** Everything the artist is credited on, like the legacy page (artist_id matches any role) */
export const artistAlbums = (artistId: string, signal?: AbortSignal) =>
  getList('album', {
    perPage: 500,
    sort: 'max_year',
    order: 'DESC',
    filter: { artist_id: artistId },
    signal,
  })

const types = (album: Album): string[] => {
  const raw = album.tags?.releasetype ?? (album.mbzAlbumType ? [album.mbzAlbumType] : [])
  return raw
    .flatMap((t) => t.toLowerCase().split(/[;,/]/))
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Which shelf an album belongs on, from the point of view of `artistId` */
export function shelfOf(album: Album, artistId: string): ShelfKind {
  if (
    album.albumArtistId !== artistId &&
    !album.participants?.albumartist?.some((p) => p.id === artistId)
  ) {
    return 'appearsOn'
  }
  const t = types(album)
  if (t.includes('live')) return 'live'
  if (t.includes('compilation') || album.compilation) return 'compilations'
  if (t.includes('soundtrack')) return 'soundtracks'
  if (t.includes('remix') || t.includes('dj-mix') || t.includes('mixtape/street')) return 'remixes'
  if (t.includes('ep')) return 'eps'
  if (t.includes('single')) return 'singles'
  if (t.length === 0 || t.includes('album')) return 'albums'
  return 'other'
}

/** Albums grouped per shelf, newest first within each, in display order; empty shelves dropped */
export function discography(
  albums: Album[],
  artistId: string,
): { kind: ShelfKind; albums: Album[] }[] {
  const groups = new Map<ShelfKind, Album[]>()
  for (const album of albums) {
    const kind = shelfOf(album, artistId)
    groups.set(kind, [...(groups.get(kind) ?? []), album])
  }
  const byDate = (a: Album, b: Album) =>
    (b.originalDate || b.releaseDate || String(b.maxYear)).localeCompare(
      a.originalDate || a.releaseDate || String(a.maxYear),
    )
  return SHELF_ORDER.filter((k) => groups.has(k)).map((kind) => ({
    kind,
    albums: groups.get(kind)!.sort(byDate),
  }))
}
