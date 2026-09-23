<script lang="ts">
  import { Play, Sparkles } from '@lucide/svelte'
  import { playAll, playlistMenu, playlistSongs } from '$lib/actions.svelte'
  import type { Playlist } from '$lib/api/types'
  import { isSmartPlaylist } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import ContextMenuArea from '$lib/components/ui/menu/ContextMenuArea.svelte'
  import Artwork from './Artwork.svelte'

  let {
    playlist,
    size = 190,
    eager = false,
  }: { playlist: Playlist; size?: number; eager?: boolean } = $props()
  let menuOpen = $state(false)
</script>

<!-- Same lockup as AlbumCard: artwork with hover play and "...", name and owner below -->
<ContextMenuArea items={() => playlistMenu(playlist)}>
  {#snippet children(props)}
    <div {...props} class="group min-w-0">
      <div class="relative">
        <a
          href={href(`/playlist/${playlist.id}/show`)}
          class="block rounded-art shadow-[0_3px_10px_rgb(0_0_0/0.15)]"
          aria-label={playlist.name}
        >
          <Artwork kind="playlist" record={playlist} {size} {eager} />
          <span
            class="absolute inset-0 rounded-art transition-colors duration-200 group-hover:bg-black/25 {menuOpen
              ? 'bg-black/25'
              : ''}"
          ></span>
        </a>
        <button
          type="button"
          aria-label={t('resources.album.actions.playAll')}
          class="absolute bottom-2.5 left-2.5 flex size-8 scale-90 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-md transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100"
          onclick={playAll(() => playlistSongs(playlist.id))}
        >
          <Play class="size-4" fill="currentColor" />
        </button>
        <div
          class="absolute right-2.5 bottom-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 {menuOpen
            ? 'opacity-100'
            : ''}"
        >
          <ActionMenu
            items={() => playlistMenu(playlist)}
            bind:open={menuOpen}
            triggerClass="size-8 bg-black/40 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
          />
        </div>
      </div>
      <div class="mt-1.5 min-w-0 pr-1">
        <a
          href={href(`/playlist/${playlist.id}/show`)}
          class="flex items-center gap-1 text-body text-label hover:underline"
        >
          {#if isSmartPlaylist(playlist)}<Sparkles class="size-3.5 shrink-0 text-accent" />{/if}
          <span class="line-clamp-2">{playlist.name}</span>
        </a>
        <div class="truncate text-body text-label-2">{playlist.ownerName}</div>
      </div>
    </div>
  {/snippet}
</ContextMenuArea>
