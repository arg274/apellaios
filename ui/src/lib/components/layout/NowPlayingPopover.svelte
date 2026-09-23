<script lang="ts">
  // Admin: what everyone is listening to right now, with live progress
  import { CirclePlay, Pause } from '@lucide/svelte'
  import { Popover } from 'bits-ui'
  import { onMount } from 'svelte'
  import config from '$lib/config'
  import { getNowPlaying, type NowPlayingEntry } from '$lib/api/subsonic'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { activity } from '$lib/state/activity.svelte'
  import { formatTrackDuration } from '$lib/utils/formatters'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import Tooltip from '$lib/components/ui/Tooltip.svelte'

  let { onnavigate }: { onnavigate?: () => void } = $props()

  let open = $state(false)
  let entries = $state<NowPlayingEntry[]>([])
  let fetchedAt = $state(0)
  let now = $state(Date.now())

  async function load() {
    try {
      entries = await getNowPlaying()
      fetchedAt = Date.now()
      activity.nowPlayingCount = entries.length
    } catch {
      // Keep the last list; the next event retries
    }
  }

  onMount(() => void load())

  // Refetch when the server says the list changed (or the stream came back), while it's visible
  $effect(() => {
    void activity.nowPlayingUpdatedAt
    void activity.reconnectedAt
    if (open) void load()
  })

  // Progress bars advance between fetches
  $effect(() => {
    if (!open) return
    const timer = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(timer)
  })

  const position = (e: NowPlayingEntry) => {
    const base = (e.positionMs ?? 0) / 1000
    const playing = e.state === 'playing' || e.state === 'starting'
    const pos = playing
      ? base + (Math.max(0, now - fetchedAt) / 1000) * (e.playbackRate || 1)
      : base
    return e.duration ? Math.min(pos, e.duration) : pos
  }

  const artistHref = (e: NowPlayingEntry) => {
    const id = e.albumArtistId || e.artistId
    if (!id) return null
    return config.devShowArtistPage && id !== config.variousArtistsId
      ? href(`/artist/${id}/show`)
      : href('/album/all', { filter: JSON.stringify({ artist_id: id }) })
  }

  const close = () => {
    open = false
    onnavigate?.()
  }
</script>

<Popover.Root bind:open>
  <Tooltip content={t('nowPlaying.title')}>
    {#snippet trigger(tooltipProps)}
      <Popover.Trigger {...tooltipProps}>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            aria-label={t('nowPlaying.title')}
            class="relative flex size-8 shrink-0 items-center justify-center rounded-full text-label-2 hover:bg-hover hover:text-label"
          >
            <CirclePlay class="size-4" />
            {#if activity.nowPlayingCount > 0}
              <span
                class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none font-bold text-on-accent tabular-nums"
              >
                {activity.nowPlayingCount}
              </span>
            {/if}
          </button>
        {/snippet}
      </Popover.Trigger>
    {/snippet}
  </Tooltip>
  <Popover.Portal>
    <Popover.Content
      side="top"
      align="end"
      sideOffset={8}
      class="glass-menu z-50 w-96 max-w-[calc(100vw-16px)] origin-floating animate-pop rounded-2xl p-2 text-body"
    >
      <h3 class="px-2 pt-2 pb-1 text-title-3 font-bold text-label">{t('nowPlaying.title')}</h3>
      {#if entries.length === 0}
        <p class="px-2 pt-1 pb-3 text-label-2">{t('nowPlaying.empty')}</p>
      {:else}
        <ul class="max-h-[360px] overflow-y-auto">
          {#each entries as e (`${e.username}-${e.playerId}`)}
            {@const pos = position(e)}
            {@const artist = e.albumArtist || e.artist}
            {@const toArtist = artistHref(e)}
            <li class="flex gap-3 rounded-xl p-2 hover:bg-hover">
              <a
                href={href(`/album/${e.albumId}/show`)}
                class="relative size-16 shrink-0"
                onclick={close}
                aria-label={e.album}
              >
                <Artwork kind="album" record={{ id: e.albumId }} size={64} />
                {#if e.state === 'paused'}
                  <span
                    class="absolute inset-0 flex items-center justify-center rounded-art bg-black/45 text-white/85"
                  >
                    <Pause class="size-4" fill="currentColor" strokeWidth={0} />
                  </span>
                {/if}
              </a>
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate font-semibold text-label" title={e.title}>{e.title}</span>
                {#if toArtist}
                  <a
                    href={toArtist}
                    class="truncate text-callout text-label-2 hover:underline"
                    onclick={close}>{artist}</a
                  >
                {:else}
                  <span class="truncate text-callout text-label-2">{artist}</span>
                {/if}
                <span class="truncate text-callout text-label-2" title={e.album}>{e.album}</span>
                <div class="mt-1 flex items-center gap-1.5 text-[10px] text-label-2 tabular-nums">
                  <span>{formatTrackDuration(pos)}</span>
                  <span class="h-[3px] flex-1 overflow-hidden rounded-full bg-fill">
                    <span
                      class="block h-full rounded-full bg-accent"
                      style:width="{e.duration ? Math.min(100, (pos / e.duration) * 100) : 0}%"
                    ></span>
                  </span>
                  <span>{formatTrackDuration(e.duration ?? 0)}</span>
                </div>
                <span class="mt-0.5 truncate text-[10px] text-label-3">
                  {e.username}{e.playerName ? ` (${e.playerName})` : ''}
                </span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
