<script lang="ts">
  import { ChevronDown, Pause, Play, SkipBack, SkipForward } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { activeLineIndex, parseLyrics } from '$lib/lyrics'
  import { player } from '$lib/player/player.svelte'
  import { formatTrackDuration } from '$lib/utils/formatters'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import Slider from '$lib/components/ui/Slider.svelte'

  const item = $derived(player.current)
  const song = $derived(player.currentSong)
  const lyrics = $derived(parseLyrics(player.details?.lyrics))
  const active = $derived(
    lyrics?.synced ? activeLineIndex(lyrics.lines, player.currentTime * 1000) : -1,
  )
  const color = $derived(song?.dominantColor ?? '#333333')

  let scrubbing = $state<number | null>(null)

  // Keep the sung line centred
  let lyricsEl = $state<HTMLElement | null>(null)
  $effect(() => {
    if (active < 0 || !lyricsEl) return
    lyricsEl
      .querySelector(`[data-line="${active}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })

  const onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') player.expanded = false
  }
</script>

<svelte:window {onkeydown} />

<!-- Full-screen player: blurred artwork backdrop, big art, synced lyrics -->
<div
  class="fixed inset-0 z-50 flex animate-sheet flex-col overflow-hidden text-white"
  role="dialog"
  aria-modal="true"
>
  <div class="absolute inset-0 -z-10" style:background={color}>
    {#if song}
      <div class="absolute inset-[-20%] opacity-80 blur-[80px] saturate-150">
        <Artwork kind="song" record={song} size={300} />
      </div>
    {/if}
    <div class="absolute inset-0 bg-black/35"></div>
  </div>

  <div class="flex h-14 shrink-0 items-center px-4">
    <IconButton
      label={t('ui.closeFullScreen')}
      variant="plain"
      class="text-white/80 hover:text-white"
      onclick={() => (player.expanded = false)}
    >
      <ChevronDown />
    </IconButton>
  </div>

  <div
    class="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 px-8 pb-10 md:grid-cols-2"
  >
    <div class="flex flex-col items-center gap-6">
      <div class="w-full max-w-[min(420px,45vh)] shadow-2xl">
        {#if item?.kind === 'radio'}
          <Artwork kind="radio" record={item.radio} size={420} eager class="rounded-art-lg" />
        {:else if song}
          <Artwork kind="song" record={song} size={420} eager class="rounded-art-lg" />
        {/if}
      </div>
      <div class="w-full max-w-[420px] text-center">
        <div class="truncate text-title-1 font-bold">
          {song?.title ?? (item?.kind === 'radio' ? item.radio.name : '')}
        </div>
        <div class="truncate text-title-3 text-white/70">
          {song ? `${song.artist} — ${song.album}` : ''}
        </div>
      </div>
      {#if !player.isRadio}
        <div class="w-full max-w-[420px]">
          <Slider
            class="[&_[data-slider-range]]:bg-white"
            value={scrubbing ?? player.currentTime}
            max={player.duration || 1}
            step={0.1}
            label={t('ui.seek', { _: 'Seek' })}
            onValueChange={(v) => (scrubbing = v)}
            onValueCommit={(v) => {
              player.seek(v)
              scrubbing = null
            }}
          />
          <div class="mt-1 flex justify-between text-callout text-white/60 tabular">
            <span>{formatTrackDuration(scrubbing ?? player.currentTime)}</span>
            <span
              >-{formatTrackDuration(
                Math.max(0, player.duration - (scrubbing ?? player.currentTime)),
              )}</span
            >
          </div>
        </div>
      {/if}
      <div class="flex items-center gap-6">
        <IconButton
          label={t('ui.previous')}
          variant="plain"
          size="lg"
          class="text-white"
          onclick={player.prev}
        >
          <SkipBack fill="currentColor" />
        </IconButton>
        <IconButton
          label={player.paused ? t('ui.play') : t('ui.pause')}
          variant="plain"
          size="xl"
          class="text-white"
          onclick={player.togglePlay}
        >
          {#if player.paused}<Play fill="currentColor" />{:else}<Pause fill="currentColor" />{/if}
        </IconButton>
        <IconButton
          label={t('ui.next')}
          variant="plain"
          size="lg"
          class="text-white"
          onclick={player.next}
          disabled={!player.canNext}
        >
          <SkipForward fill="currentColor" />
        </IconButton>
      </div>
    </div>

    <div
      bind:this={lyricsEl}
      class="scrollbar-none hidden h-full max-h-[70vh] overflow-y-auto [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)] md:block"
    >
      {#if lyrics}
        <div class="flex flex-col gap-5 py-[30vh]">
          {#each lyrics.lines as line, i (i)}
            <button
              type="button"
              data-line={i}
              disabled={!lyrics.synced || line.start === undefined}
              class="text-left text-[28px] leading-tight font-bold transition-all duration-300 {lyrics.synced
                ? i === active
                  ? 'text-white'
                  : 'text-white/35 blur-[0.5px] hover:text-white/60'
                : 'text-white/90'}"
              onclick={() => line.start !== undefined && player.seek(line.start / 1000)}
            >
              {line.value || '♪'}
            </button>
          {/each}
        </div>
      {:else}
        <div class="flex h-full items-center justify-center text-title-2 text-white/50">
          {t('ui.noLyrics')}
        </div>
      {/if}
    </div>
  </div>
</div>
