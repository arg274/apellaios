<script lang="ts">
  // Apple's "Top Songs" shelf: songs flow down columns of `rows` lockups (40px art, title,
  // "Album · Year"), columns side by side, hairlines between rows. Click plays from that song.
  import { Ellipsis, Play } from '@lucide/svelte'
  import { songMenu } from '$lib/actions.svelte'
  import type { Song } from '$lib/api/types'
  import { dragMusic } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { cn } from '$lib/utils/cn'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import ContextMenuArea from '$lib/components/ui/menu/ContextMenuArea.svelte'
  import Artwork from './Artwork.svelte'
  import PlayingBars from './PlayingBars.svelte'

  let {
    songs,
    rows = 3,
    subtitle = 'album',
    class: className,
  }: {
    songs: Song[]
    rows?: number
    /** Second line: "Album · Year" (default) or the artist */
    subtitle?: 'album' | 'artist'
    class?: string
  } = $props()

  const playingId = $derived(player.currentSong?.id)
</script>

<div
  class={cn(
    'scrollbar-none grid auto-cols-[max(260px,calc((100%-2.5rem)/3))] grid-flow-col gap-x-5 overflow-x-auto',
    className,
  )}
  style:grid-template-rows="repeat({Math.min(rows, songs.length)}, 60px)"
>
  {#each songs as song, i (song.id)}
    {@const playing = song.id === playingId}
    <ContextMenuArea items={() => songMenu(song)}>
      {#snippet children(props)}
        <div
          {...props}
          role="button"
          tabindex="0"
          draggable="true"
          ondragstart={dragMusic({ ids: [song.id], label: song.title })}
          class={cn(
            'group relative flex min-w-0 items-center gap-3 rounded-lg pr-1 outline-none hover:bg-hover focus-visible:bg-hover',
            i % rows !== 0 &&
              'before:absolute before:inset-x-0 before:top-0 before:ml-[52px] before:h-px before:bg-row-divider',
          )}
          onclick={(e) => {
            if ((e.target as HTMLElement).closest('a,button')) return
            player.playTracks(songs, { startIndex: i })
          }}
          onkeydown={(e) => e.key === 'Enter' && player.playTracks(songs, { startIndex: i })}
        >
          <div class="relative size-10 shrink-0">
            <Artwork kind="song" record={song} size={40} class="rounded-[4px]" />
            <span
              class="absolute inset-0 flex items-center justify-center rounded-[4px] bg-black/40 text-white opacity-0 group-hover:opacity-100 {playing
                ? 'opacity-100'
                : ''}"
            >
              {#if playing}
                <PlayingBars playing={!player.paused} class="text-white" />
              {:else}
                <Play class="size-4" fill="currentColor" />
              {/if}
            </span>
          </div>
          <div class="min-w-0 flex-1">
            <div
              class={cn('truncate text-body', playing ? 'font-semibold text-accent' : 'text-label')}
            >
              {song.title}
            </div>
            <div class="truncate text-callout text-label-2">
              {#if subtitle === 'album'}
                <a href={href(`/album/${song.albumId}/show`)} class="hover:underline"
                  >{song.album}</a
                >{#if song.year}&nbsp;·&nbsp;{song.year}{/if}
              {:else}
                {song.artist}
              {/if}
            </div>
          </div>
          <span
            class="opacity-0 group-hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100"
          >
            <ActionMenu items={() => songMenu(song)}>
              {#snippet trigger(props)}
                <button
                  {...props}
                  aria-label={t('ui.more')}
                  class="flex size-7 items-center justify-center rounded-full text-label-2 hover:text-label"
                >
                  <Ellipsis class="size-4" />
                </button>
              {/snippet}
            </ActionMenu>
          </span>
        </div>
      {/snippet}
    </ContextMenuArea>
  {/each}
</div>
