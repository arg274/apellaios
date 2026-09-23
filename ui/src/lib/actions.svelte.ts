// Shared media actions: fetching the songs behind an album/artist/playlist, playback, starring,
// and the menu definitions used by every row, card and "..." button.
import {
  Download,
  ExternalLink,
  Pencil,
  Heart,
  HeartOff,
  Info,
  ListEnd,
  ListMusic,
  ListPlus,
  ListStart,
  Play,
  RefreshCw,
  Share,
  Shuffle,
  Sparkles,
} from '@lucide/svelte'
import config from '$lib/config'
import { getSongPlaylists, refreshMetadata } from '$lib/api/native'
import { getAll } from '$lib/api/rest'
import { session } from '$lib/api/session'
import * as subsonic from '$lib/api/subsonic'
import type { Album, Artist, Playlist, PlaylistTrack, Radio, Song } from '$lib/api/types'
import { menu, separator, type MenuEntry } from '$lib/components/ui/menu/types'
import { t } from '$lib/i18n/index.svelte'
import { navigate } from '$lib/nav.svelte'
import { player } from '$lib/player/player.svelte'
import { toast } from '$lib/state/toast.svelte'
import { ui } from '$lib/state/ui.svelte'
import { formatBytes } from '$lib/utils/formatters'
import { externalUrl } from '$lib/utils/urls'
import { shuffled } from '$lib/utils/misc'

// ---- Fetching songs --------------------------------------------------------------------------

export const albumSongs = (albumId: string, discNumber?: number) =>
  getAll('song', {
    sort: 'album',
    order: 'ASC',
    filter: { album_id: albumId, disc_number: discNumber, missing: false },
  })

/** Legacy parity: an artist's first 200 songs, in album order */
export const artistSongs = (artistId: string) =>
  getAll(
    'song',
    { sort: 'album', order: 'ASC', filter: { album_artist_id: artistId, missing: false } },
    200,
  )

export const playlistSongs = (playlistId: string) =>
  getAll('playlistTrack', { sort: 'id', order: 'ASC', filter: { playlist_id: playlistId } })

/** Subsonic song objects (top songs, similar songs) mapped onto the native shape */
export const fromSubsonic = (s: Record<string, unknown>): Song => {
  const rg = s.replayGain as Record<string, number> | undefined
  return {
    ...(s as unknown as Song),
    artist: (s.displayArtist as string) ?? (s.artist as string),
    rgAlbumGain: rg?.albumGain,
    rgAlbumPeak: rg?.albumPeak,
    rgTrackGain: rg?.trackGain,
    rgTrackPeak: rg?.trackPeak,
  }
}

type SongSource = () => Promise<(Song | PlaylistTrack)[]>

/** Runs a playback action over lazily fetched songs, reporting fetch failures */
const withSongs =
  (source: SongSource, action: (songs: (Song | PlaylistTrack)[]) => void) => async () => {
    try {
      const songs = await source()
      if (songs.length === 0) return
      action(songs)
    } catch {
      toast.error(t('ra.page.error'))
    }
  }

export const playAll = (source: SongSource) => withSongs(source, (s) => player.playTracks(s))
export const shuffleAll = (source: SongSource) =>
  withSongs(source, (s) => player.playTracks(s, { shuffle: true }))
export const queueNext = (source: SongSource) => withSongs(source, (s) => player.playNext(s))
export const queueLast = (source: SongSource) => withSongs(source, (s) => player.addToQueue(s))

export const playTopSongs = async (artistName: string) => {
  try {
    const songs = await subsonic.getTopSongs(artistName, 100)
    if (!songs.length) return toast.warning(t('message.noTopSongsFound'))
    player.playTracks(songs.map(fromSubsonic))
  } catch {
    toast.error(t('ra.page.error'))
  }
}

/** Instant mix: similar songs, optionally led by the seed track */
export const playSimilar = async (id: string, opts: { seed?: Song; shuffle?: boolean } = {}) => {
  toast.info(t('message.startingInstantMix'))
  try {
    let songs = (await subsonic.getSimilarSongs2(id, 100)).map(fromSubsonic)
    if (opts.shuffle) songs = shuffled(songs)
    if (!songs.length && !opts.seed) return toast.warning(t('message.noSimilarSongsFound'))
    if (opts.seed) songs = [opts.seed, ...songs.filter((s) => s.id !== opts.seed!.id)]
    player.playTracks(songs)
  } catch {
    toast.error(t('ra.page.error'))
  }
}

// ---- Annotations -----------------------------------------------------------------------------

/** Toggles a star, returning the new state (undefined if the request failed) */
export const toggleStar = async (record: { id: string; starred?: boolean }) => {
  const next = !record.starred
  try {
    await (next ? subsonic.star(record.id) : subsonic.unstar(record.id))
    if (player.details?.id === record.id) player.updateDetails({ starred: next })
    return next
  } catch {
    toast.error(t('ra.page.error'))
    return undefined
  }
}

export const rate = async (id: string, rating: number) => {
  try {
    await subsonic.setRating(id, rating)
    if (player.details?.id === id) player.updateDetails({ rating })
    return true
  } catch {
    toast.error(t('ra.page.error'))
    return false
  }
}

export const refreshInfo = async (resource: 'album' | 'artist', id: string) => {
  try {
    await refreshMetadata(resource, id)
    toast.info(t('message.metadataRefreshStarted'))
  } catch {
    toast.error(t('ra.page.error'))
  }
}

// ---- Menus -----------------------------------------------------------------------------------

const artistDownloadSize = (a: Artist) => a.stats?.albumartist?.size ?? a.size ?? 0

const queueEntries = (source: SongSource, resource: 'album' | 'song'): MenuEntry[] => [
  {
    label: t(`resources.${resource}.actions.playNext`),
    icon: ListStart,
    onSelect: queueNext(source),
  },
  {
    label: t(`resources.${resource}.actions.addToQueue`),
    icon: ListEnd,
    onSelect: queueLast(source),
  },
]

export function albumMenu(
  album: Album,
  opts: { discNumber?: number; starred?: boolean; onStar?: (v: boolean) => void } = {},
) {
  const source = () => albumSongs(album.id, opts.discNumber)
  const starred = opts.starred ?? album.starred
  return menu(
    { label: t('resources.album.actions.playAll'), icon: Play, onSelect: playAll(source) },
    { label: t('resources.album.actions.shuffle'), icon: Shuffle, onSelect: shuffleAll(source) },
    ...queueEntries(source, 'album'),
    separator,
    {
      label: t('resources.album.actions.addToPlaylist'),
      icon: ListPlus,
      onSelect: () =>
        (ui.addToPlaylist = opts.discNumber
          ? {
              discs: [
                {
                  albumId: album.id,
                  releaseDate: album.releaseDate ?? '',
                  discNumber: opts.discNumber,
                },
              ],
              label: album.name,
            }
          : { albumIds: [album.id], label: album.name }),
    },
    config.enableFavourites && {
      label: starred ? t('ui.removeFromFavourites') : t('ui.addToFavourites'),
      icon: starred ? HeartOff : Heart,
      onSelect: async () => {
        const next = await toggleStar({ id: album.id, starred })
        if (next !== undefined) opts.onStar?.(next)
      },
    },
    separator,
    config.enableSharing && {
      label: t('ra.action.share'),
      icon: Share,
      onSelect: () => (ui.share = { resource: 'album', ids: [album.id], name: album.name }),
    },
    config.enableDownloads &&
      album.size > 0 && {
        label: `${t('ra.action.download')} (${formatBytes(album.size)})`,
        icon: Download,
        onSelect: () => (ui.download = { resource: 'album', record: album }),
      },
    session.isAdmin && {
      label: t('resources.album.actions.refresh'),
      icon: RefreshCw,
      onSelect: () => refreshInfo('album', album.id),
    },
    {
      label: t('resources.album.actions.info'),
      icon: Info,
      onSelect: () => (ui.info = { resource: 'album', record: album }),
    },
  )
}

export function artistMenu(
  artist: Artist,
  opts: { starred?: boolean; onStar?: (v: boolean) => void } = {},
) {
  const source = () => artistSongs(artist.id)
  const size = artistDownloadSize(artist)
  const starred = opts.starred ?? artist.starred
  return menu(
    { label: t('resources.album.actions.playAll'), icon: Play, onSelect: playAll(source) },
    { label: t('resources.album.actions.shuffle'), icon: Shuffle, onSelect: shuffleAll(source) },
    ...queueEntries(source, 'album'),
    config.enableExternalServices && {
      label: t('resources.artist.actions.radio', { _: 'Radio' }),
      icon: Sparkles,
      onSelect: () => playSimilar(artist.id, { shuffle: true }),
    },
    separator,
    {
      label: t('resources.album.actions.addToPlaylist'),
      icon: ListPlus,
      onSelect: () => (ui.addToPlaylist = { artistIds: [artist.id], label: artist.name }),
    },
    config.enableFavourites && {
      label: starred ? t('ui.removeFromFavourites') : t('ui.addToFavourites'),
      icon: starred ? HeartOff : Heart,
      onSelect: async () => {
        const next = await toggleStar({ id: artist.id, starred })
        if (next !== undefined) opts.onStar?.(next)
      },
    },
    separator,
    config.enableSharing &&
      size > 0 && {
        label: t('ra.action.share'),
        icon: Share,
        onSelect: () => (ui.share = { resource: 'artist', ids: [artist.id], name: artist.name }),
      },
    config.enableDownloads &&
      size > 0 && {
        label: `${t('ra.action.download')} (${formatBytes(size)})`,
        icon: Download,
        onSelect: () => (ui.download = { resource: 'artist', record: artist }),
      },
    session.isAdmin && {
      label: t('resources.album.actions.refresh'),
      icon: RefreshCw,
      onSelect: () => refreshInfo('artist', artist.id),
    },
  )
}

export function playlistMenu(playlist: Playlist) {
  const source = () => playlistSongs(playlist.id)
  return menu(
    { label: t('resources.album.actions.playAll'), icon: Play, onSelect: playAll(source) },
    { label: t('resources.album.actions.shuffle'), icon: Shuffle, onSelect: shuffleAll(source) },
    ...queueEntries(source, 'album'),
    separator,
    config.enableSharing && {
      label: t('ra.action.share'),
      icon: Share,
      onSelect: () =>
        (ui.share = { resource: 'playlist', ids: [playlist.id], name: playlist.name }),
    },
    config.enableDownloads && {
      label: `${t('ra.action.download')} (${formatBytes(playlist.size)})`,
      icon: Download,
      onSelect: () => (ui.download = { resource: 'playlist', record: playlist }),
    },
  )
}

export function radioMenu(radio: Radio) {
  return menu(
    {
      label: t('resources.radio.actions.playNow'),
      icon: Play,
      onSelect: () => player.playRadio(radio),
    },
    !!externalUrl(radio.homePageUrl) && {
      label: t('resources.radio.fields.homePageUrl'),
      icon: ExternalLink,
      onSelect: () =>
        void window.open(externalUrl(radio.homePageUrl), '_blank', 'noopener,noreferrer'),
    },
    session.isAdmin && separator,
    session.isAdmin && {
      label: t('ra.action.edit'),
      icon: Pencil,
      onSelect: () => navigate(`/radio/${radio.id}`),
    },
  )
}

export interface SongMenuOptions {
  /** Extra entries (e.g. "Remove from playlist") appended in their own group */
  extra?: MenuEntry[]
  starred?: boolean
  onStar?: (v: boolean) => void
  /** Hide entries that make no sense in the current context */
  hide?: ('addToPlaylist' | 'info')[]
}

/** Actions for one song. For a selection of many songs use `songsMenu`. */
export function songMenu(song: Song | PlaylistTrack, opts: SongMenuOptions = {}) {
  const one = async () => [song]
  const id = 'mediaFileId' in song ? song.mediaFileId : song.id
  const starred = opts.starred ?? song.starred
  return menu(
    { label: t('resources.song.actions.playNow'), icon: Play, onSelect: playAll(one) },
    ...queueEntries(one, 'song'),
    config.enableExternalServices && {
      label: t('resources.song.actions.instantMix'),
      icon: Sparkles,
      onSelect: () => playSimilar(id, { seed: { ...song, id } as Song }),
    },
    separator,
    !opts.hide?.includes('addToPlaylist') && {
      label: t('resources.song.actions.addToPlaylist'),
      icon: ListPlus,
      onSelect: () => (ui.addToPlaylist = { ids: [id], label: song.title }),
    },
    config.enableFavourites && {
      label: starred ? t('ui.removeFromFavourites') : t('ui.addToFavourites'),
      icon: starred ? HeartOff : Heart,
      onSelect: async () => {
        const next = await toggleStar({ id, starred })
        if (next !== undefined) opts.onStar?.(next)
      },
    },
    {
      type: 'asyncSub',
      label: t('resources.song.actions.showInPlaylist'),
      icon: ListMusic,
      loadingLabel: t('ui.loadingPlaylists'),
      emptyLabel: t('ui.notInAnyPlaylist'),
      load: async () =>
        (await getSongPlaylists(id)).map((pl) => ({
          label: pl.name,
          onSelect: () => void navigate(`/playlist/${pl.id}/show`),
        })),
    },
    separator,
    config.enableSharing && {
      label: t('ra.action.share'),
      icon: Share,
      onSelect: () => (ui.share = { resource: 'song', ids: [id], name: song.title }),
    },
    config.enableDownloads && {
      label: `${t('ra.action.download')} (${formatBytes(song.size)})`,
      icon: Download,
      onSelect: () => (ui.download = { resource: 'song', record: { ...song, id } as Song }),
    },
    !opts.hide?.includes('info') && {
      label: t('resources.song.actions.info'),
      icon: Info,
      onSelect: () => (ui.info = { resource: 'song', record: { ...song, id } as Song }),
    },
    ...(opts.extra?.length ? [separator, ...opts.extra] : []),
  )
}

/** Actions for a multi-selection of songs */
export function songsMenu(songs: (Song | PlaylistTrack)[], extra: MenuEntry[] = []) {
  const source = async () => songs
  const ids = songs.map((s) => ('mediaFileId' in s ? s.mediaFileId : s.id))
  return menu(
    { label: t('resources.album.actions.playAll'), icon: Play, onSelect: playAll(source) },
    { label: t('resources.album.actions.shuffle'), icon: Shuffle, onSelect: shuffleAll(source) },
    ...queueEntries(source, 'song'),
    separator,
    {
      label: t('resources.song.actions.addToPlaylist'),
      icon: ListPlus,
      onSelect: () => (ui.addToPlaylist = { ids }),
    },
    config.enableFavourites && {
      label: t('ui.addToFavourites'),
      icon: Heart,
      onSelect: () => subsonic.star(ids).catch(() => toast.error(t('ra.page.error'))),
    },
    config.enableFavourites && {
      label: t('ui.removeFromFavourites'),
      icon: HeartOff,
      onSelect: () => subsonic.unstar(ids).catch(() => toast.error(t('ra.page.error'))),
    },
    config.enableSharing && {
      label: t('ra.action.share'),
      icon: Share,
      onSelect: () => (ui.share = { resource: 'song', ids, name: '' }),
    },
    ...(extra.length ? [separator, ...extra] : []),
  )
}
