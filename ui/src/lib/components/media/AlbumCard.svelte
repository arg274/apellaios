<script lang="ts">
  import { Play } from '@lucide/svelte'
  import { albumMenu, albumSongs, playAll } from '$lib/actions.svelte'
  import type { Album } from '$lib/api/types'
  import { dragMusic } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import ContextMenuArea from '$lib/components/ui/menu/ContextMenuArea.svelte'
  import Artwork from './Artwork.svelte'

  let {
    album,
    /** What the second line shows: the artist (default) or the year (on artist pages) */
    subtitle = 'artist',
    size = 220,
    eager = false,
  }: {
    album: Album
    subtitle?: 'artist' | 'year' | 'both'
    size?: number
    eager?: boolean
  } = $props()

  let starred = $state<boolean | undefined>(undefined)
  const isStarred = $derived(starred ?? album.starred)
  const year = $derived(
    album.maxYear && album.minYear !== album.maxYear && album.minYear
      ? `${album.minYear} – ${album.maxYear}`
      : album.maxYear || '',
  )
  const menuItems = () => albumMenu(album, { starred: isStarred, onStar: (v) => (starred = v) })
  let menuOpen = $state(false)
</script>

<ContextMenuArea items={menuItems}>
  {#snippet children(props)}
    <div {...props} class="group min-w-0">
      <div class="relative">
        <a
          href={href(`/album/${album.id}/show`)}
          draggable="true"
          ondragstart={dragMusic({ albumIds: [album.id], label: album.name })}
          class="block rounded-art shadow-[0_3px_10px_rgb(0_0_0/0.15)] transition-shadow group-hover:shadow-[0_6px_16px_rgb(0_0_0/0.25)]"
          aria-label={album.name}
        >
          <Artwork kind="album" record={album} {size} {eager} alt="" />
          <span
            class="absolute inset-0 rounded-art bg-black/0 transition-colors duration-200 group-hover:bg-black/25 {menuOpen
              ? 'bg-black/25'
              : ''}"
          ></span>
        </a>
        <button
          type="button"
          aria-label={t('resources.album.actions.playAll')}
          class="absolute bottom-2.5 left-2.5 flex size-8 scale-90 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-md transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100"
          onclick={playAll(() => albumSongs(album.id))}
        >
          <Play class="size-4" fill="currentColor" />
        </button>
        <div
          class="absolute right-2.5 bottom-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100"
        >
          <ActionMenu
            items={menuItems}
            bind:open={menuOpen}
            triggerClass="size-8 bg-black/40 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
          />
        </div>
      </div>
      <div class="mt-1.5 min-w-0 pr-1">
        <a
          href={href(`/album/${album.id}/show`)}
          class="line-clamp-2 text-body text-label hover:underline"
        >
          {album.name}
        </a>
        {#if subtitle === 'artist' || subtitle === 'both'}
          <a
            href={href(`/artist/${album.albumArtistId}/show`)}
            class="block truncate text-body text-label-2 hover:underline"
          >
            {album.albumArtist}
          </a>
        {/if}
        {#if (subtitle === 'year' || subtitle === 'both') && year}
          <div class="truncate text-body text-label-2">{year}</div>
        {/if}
      </div>
    </div>
  {/snippet}
</ContextMenuArea>
