import type { Album, Artist, Playlist, Song } from '$lib/api/types'
import type { PlaylistAddition } from '$lib/api/native'
import { pageTint, tintIsDark } from '$lib/utils/color'
import { settings } from './settings.svelte'

export type ShareableResource = 'album' | 'song' | 'playlist' | 'artist'

export interface AddToPlaylistRequest extends PlaylistAddition {
  /** Shown when the selection is empty, and used for duplicate detection of single songs */
  label?: string
  onSuccess?: () => void
}

export interface ShareRequest {
  resource: ShareableResource
  ids: string[]
  name: string
}

export interface DownloadRequest {
  resource: 'album' | 'song' | 'playlist' | 'artist'
  record: Album | Song | Playlist | Artist
}

/** Global UI state: dialogs anyone can open, the artwork page tint, the mobile nav drawer */
class UiState {
  /** "#rrggbb" set by album/artist/playlist pages to tint the page like Apple Music */
  tint = $state<string | null>(null)
  mobileNavOpen = $state(false)

  addToPlaylist = $state.raw<AddToPlaylistRequest | null>(null)
  share = $state.raw<ShareRequest | null>(null)
  download = $state.raw<DownloadRequest | null>(null)
  /** Get Info dialog for a song or an album */
  info = $state.raw<{ resource: 'song' | 'album'; record: Song | Album } | null>(null)
  saveQueue = $state(false)
  about = $state(false)
  help = $state(false)
  quickConnect = $state(false)
  listenBrainzToken = $state(false)

  /** The scheme in effect: a dark artwork tint forces light-on-dark text, like Apple's override */
  get isDark(): boolean {
    return settings.isDark || tintIsDark(this.tint, settings.isDark)
  }

  /** The flat page colour for the current tint, or null on untinted pages */
  get tintColor(): string | null {
    return pageTint(this.tint, this.isDark)
  }

  /** Sets the page tint for the lifetime of the calling effect */
  useTint(color: () => string | null | undefined) {
    $effect(() => {
      this.tint = color() ?? null
      return () => {
        this.tint = null
      }
    })
  }
}

export const ui = new UiState()
