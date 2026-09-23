import { Clock, Dices, Disc3, Heart, History, Repeat2, Star } from '@lucide/svelte'
import type { Component } from 'svelte'
import config from '$lib/config'
import type { Filter, SortOrder } from '$lib/api/rest'

export interface AlbumListPreset {
  id: string
  icon: Component
  sort: string
  order: SortOrder
  filter: Filter
}

// The legacy album lists, with the same sort/filter presets and the same URLs (#/album/<id>)
export const ALBUM_LISTS: AlbumListPreset[] = [
  { id: 'recentlyAdded', icon: Clock, sort: 'recently_added', order: 'DESC', filter: {} },
  { id: 'all', icon: Disc3, sort: 'name', order: 'ASC', filter: {} },
  ...(config.enableFavourites
    ? [
        {
          id: 'starred',
          icon: Heart,
          sort: 'starred_at',
          order: 'DESC' as const,
          filter: { starred: true },
        },
      ]
    : []),
  {
    id: 'recentlyPlayed',
    icon: History,
    sort: 'play_date',
    order: 'DESC',
    filter: { recently_played: true },
  },
  {
    id: 'mostPlayed',
    icon: Repeat2,
    sort: 'play_count',
    order: 'DESC',
    filter: { recently_played: true },
  },
  ...(config.enableStarRating
    ? [
        {
          id: 'topRated',
          icon: Star,
          sort: 'rating',
          order: 'DESC' as const,
          filter: { has_rating: true },
        },
      ]
    : []),
  { id: 'random', icon: Dices, sort: 'random', order: 'ASC', filter: {} },
]

export const DEFAULT_ALBUM_LIST = 'recentlyAdded'

export const albumList = (id: string | undefined): AlbumListPreset =>
  ALBUM_LISTS.find((l) => l.id === id) ?? ALBUM_LISTS.find((l) => l.id === 'all')!
