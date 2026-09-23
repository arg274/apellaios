import { flushSync, untrack } from 'svelte'
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

  /** How many mounted pages currently tint the window */
  #tintClaims = 0

  /**
   * Tints the window while the calling component is mounted. `color` returns undefined while the
   * record is still loading, which keeps whatever tint is showing, so going from one tinted page
   * to another never flashes the plain background in between; null means the record has no tint.
   */
  useTint(color: () => string | null | undefined) {
    $effect(() => {
      const next = color()
      if (next !== undefined) untrack(() => this.#fadeTo(next))
    })
    $effect(() => {
      this.#tintClaims++
      return () => {
        this.#tintClaims--
        // The next page mounts just after this one unmounts: give it a tick to claim the tint
        setTimeout(() => {
          if (this.#tintClaims === 0) this.#fadeTo(null)
        })
      }
    })
  }

  /**
   * Crossfades the whole window to the new tint with a view transition, which also covers the
   * scheme flip a dark tint forces. Without support (or with reduced motion) it switches at once,
   * and the page background still eases on its own.
   */
  #fadeTo(next: string | null) {
    if (next === this.tint) return
    const instant =
      !document.startViewTransition ||
      document.visibilityState !== 'visible' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    if (instant) {
      this.tint = next
      return
    }
    document.startViewTransition(() => {
      this.tint = next
      // Render the new tint (and ThemeRoot's scheme class) before the browser snapshots it
      flushSync()
    })
  }
}

export const ui = new UiState()
