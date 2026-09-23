<script lang="ts">
  // The public page behind a share link: an album-style header, the tracklist and a glass player
  // pill, following the logged-in album page. No session, so no menus, stars or queue.
  import { Download, FastForward, Pause, Play, Rewind } from '@lucide/svelte'
  import { onDestroy } from 'svelte'
  import { BRAND } from '$lib/brand'
  import config, { type ShareInfo } from '$lib/config'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'
  import { formatDuration2, formatTrackDuration } from '$lib/utils/formatters'
  import { shareDownloadUrl } from '$lib/utils/urls'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import LcdProgress from '$lib/components/player/LcdProgress.svelte'
  import PlayingBars from '$lib/components/media/PlayingBars.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import ShareArt from './ShareArt.svelte'
  import { SharePlayback } from './sharePlayback.svelte'

  let { info }: { info: ShareInfo } = $props()

  // A share's tracks are fixed for the page's lifetime
  // svelte-ignore state_referenced_locally
  const playback = new SharePlayback(info.tracks)
  const tracks = playback.tracks

  const albums = new Set(tracks.map((s) => s.album))
  const artists = [...new Set(tracks.map((s) => s.artist))]
  const totalDuration = tracks.reduce((sum, s) => sum + (s.duration || 0), 0)
  const title = $derived(info.description || (albums.size === 1 ? tracks[0]?.album : '') || BRAND)
  const artistLine = $derived(artists.length === 1 ? artists[0] : t('ui.variousArtists'))
  const canDownload = $derived(info.downloadable && config.enableDownloads)

  let scrubbing = $state<number | null>(null)
  let progressExpanded = $state(false)
  const position = $derived(scrubbing ?? playback.position)

  // The browser takes a moment to show its download UI; keep the button inert meanwhile
  let downloading = $state(false)
  let downloadTimer: ReturnType<typeof setTimeout> | undefined
  onDestroy(() => clearTimeout(downloadTimer))

  function download() {
    // An anchor, not a navigation: a service worker's navigation route would swallow the archive
    const a = document.createElement('a')
    a.href = shareDownloadUrl(info.id)
    a.download = ''
    document.body.append(a)
    a.click()
    a.remove()
    downloading = true
    clearTimeout(downloadTimer)
    downloadTimer = setTimeout(() => (downloading = false), 5000)
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== ' ' || (e.target as HTMLElement).closest('input,textarea,button,[role=slider]'))
      return
    e.preventDefault()
    playback.toggle()
  }
</script>

<svelte:window {onkeydown} />
<PageTitle title={playback.current ? `${playback.current.title} · ${title}` : title} />

<audio {@attach playback.attach} preload="none"></audio>

{#snippet control(
  label: string,
  onclick: () => void,
  disabled: boolean,
  glyph: import('svelte').Snippet,
)}
  <button
    type="button"
    aria-label={label}
    class="relative size-6 shrink-0 text-label transition-colors duration-200 disabled:pointer-events-none disabled:text-label-3"
    {disabled}
    {onclick}
  >
    <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >{@render glyph()}</span
    >
  </button>
{/snippet}

<div class="min-h-dvh bg-page">
  <main class="mx-auto max-w-[980px] px-5 pt-10 pb-36 sm:px-10">
    <section class="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8">
      <div
        class="w-[min(270px,70vw)] shrink-0 self-center overflow-hidden rounded-art-lg shadow-[0_10px_20px_rgb(0_0_0/0.3)] md:self-auto"
      >
        <ShareArt id={tracks[0]?.id} alt={title} size={270} eager />
      </div>

      <div class="flex min-w-0 flex-1 flex-col text-center md:text-left">
        <div class="hidden flex-1 md:block"></div>
        <h1 class="mb-px text-[26px] leading-[30px] font-bold text-label">{title}</h1>
        <div class="text-[26px] leading-[30px] text-label">{artistLine}</div>
        <div class="mt-1 text-callout leading-[15px] font-semibold text-label-2">
          {tracks.length}
          {t('resources.song.name', { smart_count: tracks.length })} · {formatDuration2(
            totalDuration,
          )}
        </div>
        <div class="hidden flex-1 md:block"></div>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
          <Button
            size="lg"
            onclick={() => (playback.index < 0 ? playback.play(0) : playback.toggle())}
          >
            {#if playback.paused}
              <Play fill="currentColor" />{t('resources.album.actions.playAll')}
            {:else}
              <Pause fill="currentColor" />{t('ui.pause', { _: 'Pause' })}
            {/if}
          </Button>
          {#if canDownload}
            <Button size="lg" variant="secondary" disabled={downloading} onclick={download}>
              <Download />{t('ra.action.download')}
            </Button>
          {/if}
        </div>
      </div>
    </section>

    <ol class="mt-10">
      {#each tracks as track, i (track.id)}
        {@const current = i === playback.index}
        <!-- Dividers live on the items so a highlighted row can hide its own and the next one's -->
        <li
          class={cn(
            'border-t border-row-divider last:border-b has-[>button:hover]:border-transparent [&:has(>button:hover)+li]:border-t-transparent',
            current && 'border-transparent [&+li]:border-t-transparent',
          )}
        >
          <button
            type="button"
            class={cn(
              'group grid h-[45px] w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center rounded-xl text-left text-body text-label-2 hover:bg-hover',
              current && 'bg-selected',
            )}
            aria-current={current || undefined}
            onclick={() => playback.play(i)}
          >
            <span class="flex justify-center tabular-nums">
              {#if current}
                <PlayingBars playing={!playback.paused} />
              {:else}
                <span class="group-hover:hidden">{i + 1}</span>
                <Play
                  class="hidden size-3.5 text-label group-hover:block"
                  fill="currentColor"
                  strokeWidth={0}
                />
              {/if}
            </span>
            <span class="min-w-0 pr-4">
              <span class="block truncate text-label">{track.title}</span>
              {#if artists.length > 1 || albums.size > 1}
                <span class="block truncate text-callout"
                  >{track.artist}{albums.size > 1 ? ` — ${track.album}` : ''}</span
                >
              {/if}
            </span>
            <span class="pr-[18px] tabular-nums">{formatTrackDuration(track.duration)}</span>
          </button>
        </li>
      {/each}
    </ol>

    <footer class="mt-[34px] pl-3 text-body leading-[18px] text-label-2">
      {tracks.length}
      {t('resources.song.name', { smart_count: tracks.length })}, {formatDuration2(totalDuration)}
      <div class="mt-4 text-callout text-label-3">{BRAND}</div>
    </footer>
  </main>

  <!-- The same glass pill as the app's player, minus everything that needs an account -->
  <div class="fixed inset-x-0 bottom-5 flex justify-center px-5">
    <div
      class="glass grid h-14 w-full max-w-[668px] grid-cols-[auto_1fr] place-items-center rounded-full px-4 text-label"
    >
      <div class="flex gap-2">
        {#snippet prevGlyph()}<Rewind
            class="size-6"
            fill="currentColor"
            strokeWidth={0}
          />{/snippet}
        {@render control(
          t('ui.previous', { _: 'Previous' }),
          playback.previous,
          playback.index < 0,
          prevGlyph,
        )}
        {#snippet playGlyph()}
          {#if playback.paused}
            <Play class="size-[26px]" fill="currentColor" strokeWidth={0} />
          {:else}
            <Pause class="size-[26px]" fill="currentColor" strokeWidth={0} />
          {/if}
        {/snippet}
        {@render control(
          playback.paused ? t('ui.play', { _: 'Play' }) : t('ui.pause', { _: 'Pause' }),
          playback.toggle,
          false,
          playGlyph,
        )}
        {#snippet nextGlyph()}<FastForward
            class="size-6"
            fill="currentColor"
            strokeWidth={0}
          />{/snippet}
        {@render control(t('ui.next', { _: 'Next' }), playback.next, !playback.hasNext, nextGlyph)}
      </div>

      <div class="min-w-0 self-stretch justify-self-stretch pl-4">
        <div
          class="grid h-14 grid-cols-[34px_minmax(0,1fr)] grid-rows-[34px_auto] content-center gap-x-2 pt-2"
        >
          <div class="size-[34px] overflow-hidden rounded-[6px]">
            <ShareArt id={playback.current?.id} size={34} />
          </div>
          <div
            class={cn('min-w-0 self-center transition-opacity', progressExpanded && 'opacity-50')}
          >
            {#if playback.current}
              <span class="block truncate text-body leading-4 font-semibold text-label"
                >{playback.current.title}</span
              >
              <span
                class="mt-0.5 block truncate text-callout leading-[15px] font-medium text-label-2"
                >{playback.current.artist} — {playback.current.album}</span
              >
            {:else}
              <span class="block truncate text-body leading-4 font-semibold text-label-2"
                >{title}</span
              >
            {/if}
          </div>
          <div class="col-span-2 self-start">
            {#if playback.current}
              <LcdProgress
                {position}
                duration={playback.duration}
                onscrub={(v) => (scrubbing = v)}
                onseek={(v) => playback.seek(v)}
                onexpand={(v) => (progressExpanded = v)}
              />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
