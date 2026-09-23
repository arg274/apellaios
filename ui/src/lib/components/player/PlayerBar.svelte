<script lang="ts">
  // The floating "chrome player", following music.apple.com's own rules:
  //   .chrome-player   grid auto|1fr|auto, 56px tall, max 668px, 16px inline padding, glass
  //   playback         24px buttons 8px apart; glyph boxes larger than the buttons (skip 28, play 34)
  //   LCD              16px inline padding; grid artwork 34px | metadata | after-metadata, then a
  //                    progress row; 8px top padding; title 13/16 600, subtitle 12/15 500 +2px
  //   actions          9px gap, -4px end margin; 24x28 queue button; 28px volume with a 152x40
  //                    glass slider that grows out of it
  import {
    Ellipsis,
    FastForward,
    Heart,
    ListMusic,
    Maximize2,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Rewind,
    Shuffle,
    Volume,
    Volume1,
    Volume2,
    VolumeX,
  } from '@lucide/svelte'
  import type { Snippet } from 'svelte'
  import config from '$lib/config'
  import { songMenu, toggleStar } from '$lib/actions.svelte'
  import { dragMusic } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { cn } from '$lib/utils/cn'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import Slider from '$lib/components/ui/Slider.svelte'
  import Tooltip from '$lib/components/ui/Tooltip.svelte'
  import LcdProgress from './LcdProgress.svelte'

  let { class: className }: { class?: string } = $props()

  const item = $derived(player.current)
  const song = $derived(player.currentSong)
  const starred = $derived(player.details?.starred ?? song?.starred ?? false)

  let scrubbing = $state<number | null>(null)
  const position = $derived(scrubbing ?? player.currentTime)
  let progressExpanded = $state(false)
  let volumeOpen = $state(false)

  const title = $derived(
    item?.kind === 'radio'
      ? item.radio.name
      : song
        ? song.title + (song.tags?.subtitle?.[0] ? ` (${song.tags.subtitle[0]})` : '')
        : '',
  )
  const subtitle = $derived(
    item?.kind === 'radio'
      ? t('resources.radio.name', { smart_count: 1 })
      : song
        ? `${song.artist} — ${song.album}`
        : '',
  )
  const link = $derived(
    item?.kind === 'radio'
      ? href('/radio')
      : song?.playlistId
        ? href(`/playlist/${song.playlistId}/show`)
        : song
          ? href(`/album/${song.albumId}/show`)
          : href('/'),
  )

  const level = $derived(player.muted ? 0 : player.volume)
  const VolumeIcon = $derived(
    level === 0 ? VolumeX : level < 0.34 ? Volume : level < 0.67 ? Volume1 : Volume2,
  )
  const RepeatIcon = $derived(player.repeat === 'one' ? Repeat1 : Repeat)
  const repeatLabel = $derived(
    player.repeat === 'off'
      ? t('ui.repeatOff')
      : player.repeat === 'all'
        ? t('ui.repeatAll')
        : t('ui.repeatOne'),
  )
</script>

{#snippet control(
  label: string,
  onclick: () => void,
  disabled: boolean,
  active: boolean,
  glyph: Snippet,
  hideBelow?: string,
)}
  <Tooltip content={label}>
    {#snippet trigger(props)}
      <button
        {...props}
        type="button"
        aria-label={label}
        aria-pressed={active || undefined}
        class={cn(
          'relative size-6 shrink-0 text-label transition-colors duration-200 ease-out disabled:pointer-events-none disabled:text-label-3',
          active && 'text-accent',
          hideBelow,
        )}
        {disabled}
        {onclick}
      >
        <!-- The glyph box is centred on, and may be larger than, the 24px button -->
        <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >{@render glyph()}</span
        >
      </button>
    {/snippet}
  </Tooltip>
{/snippet}

<div
  class={cn(
    'glass grid h-14 w-full max-w-[668px] grid-cols-[auto_1fr_auto] place-items-center rounded-full px-4 text-label',
    className,
  )}
  role="region"
  aria-label={t('ui.nowPlaying', { _: 'Now Playing' })}
>
  <!-- Playback controls -->
  <div class="flex gap-2">
    {#snippet shuffleGlyph()}<Shuffle class="size-[18px]" strokeWidth={2.25} />{/snippet}
    {@render control(
      t('ui.shuffle'),
      player.toggleShuffle,
      player.isRadio,
      player.shuffle,
      shuffleGlyph,
      'max-md:hidden',
    )}
    {#snippet prevGlyph()}<Rewind class="size-6" fill="currentColor" strokeWidth={0} />{/snippet}
    {@render control(
      t('ui.previous'),
      player.prev,
      player.isRadio,
      false,
      prevGlyph,
      'max-sm:hidden',
    )}
    {#snippet playGlyph()}
      {#if player.paused}
        <Play class="size-[26px]" fill="currentColor" strokeWidth={0} />
      {:else}
        <Pause class="size-[26px]" fill="currentColor" strokeWidth={0} />
      {/if}
    {/snippet}
    {@render control(
      player.paused ? t('ui.play') : t('ui.pause'),
      player.togglePlay,
      false,
      false,
      playGlyph,
    )}
    {#snippet nextGlyph()}<FastForward
        class="size-6"
        fill="currentColor"
        strokeWidth={0}
      />{/snippet}
    {@render control(t('ui.next'), player.next, !player.canNext, false, nextGlyph)}
    {#snippet repeatGlyph()}<RepeatIcon class="size-[18px]" strokeWidth={2.25} />{/snippet}
    {@render control(
      repeatLabel,
      player.cycleRepeat,
      player.isRadio,
      player.repeat !== 'off',
      repeatGlyph,
      'max-md:hidden',
    )}
  </div>

  <!-- LCD -->
  <div class="min-w-0 self-stretch justify-self-stretch px-4">
    <div
      class="grid h-14 grid-cols-[34px_minmax(0,1fr)_auto] grid-rows-[34px_auto] content-center gap-x-2 pt-2"
    >
      <div
        class={cn(
          'group/art relative size-[34px] rounded-[6px] transition-[scale,opacity] duration-150 ease-out hover:scale-110 has-[:focus-visible]:scale-110',
          progressExpanded && 'opacity-50',
        )}
      >
        {#if item?.kind === 'radio'}
          <Artwork kind="radio" record={item.radio} size={34} class="rounded-[6px]" />
        {:else if song}
          <Artwork kind="song" record={song} size={34} class="rounded-[6px]" />
        {/if}
        <button
          type="button"
          aria-label={t('ui.openFullScreen')}
          class="absolute inset-0 grid place-items-center rounded-[inherit] bg-[rgb(51_51_51/0.3)] text-white opacity-0 transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:opacity-100"
          onclick={() => (player.expanded = true)}
        >
          <Maximize2 class="size-3.5" />
        </button>
      </div>

      <a
        href={link}
        draggable={!!song}
        ondragstart={song ? dragMusic({ ids: [song.id], label: song.title }) : undefined}
        class={cn('min-w-0 self-center transition-opacity', progressExpanded && 'opacity-50')}
      >
        <span class="block truncate text-body leading-4 font-semibold text-label">{title}</span>
        <span class="mt-0.5 block truncate text-callout leading-[15px] font-medium text-label-2"
          >{subtitle}</span
        >
      </a>

      <div
        class={cn(
          'group/after flex items-center gap-1 self-center pr-1 transition-opacity',
          progressExpanded && 'opacity-50',
        )}
      >
        {#if config.enableFavourites && song}
          <button
            type="button"
            aria-label={starred ? t('ui.removeFromFavourites') : t('ui.addToFavourites')}
            aria-pressed={starred}
            class={cn(
              'flex size-6 items-center justify-center rounded-full',
              starred ? 'text-accent' : 'text-label-2 hover:text-label',
            )}
            onclick={() => song && toggleStar({ id: song.id, starred })}
          >
            <Heart class="size-4" fill={starred ? 'currentColor' : 'none'} />
          </button>
        {/if}
        {#if song}
          <ActionMenu items={() => songMenu(song, { starred })} side="top">
            {#snippet trigger(props)}
              <button
                {...props}
                aria-label={t('ui.more')}
                class="flex size-6 items-center justify-center rounded-full text-label hover:text-accent"
              >
                <Ellipsis class="size-4" />
              </button>
            {/snippet}
          </ActionMenu>
        {/if}
      </div>

      <div class="col-span-3 self-start">
        {#if !player.isRadio}
          <LcdProgress
            {position}
            duration={player.duration}
            onscrub={(v) => (scrubbing = v)}
            onseek={(v) => player.seek(v)}
            onexpand={(v) => (progressExpanded = v)}
          />
        {/if}
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class="-mr-1 flex gap-[9px] text-label">
    <Tooltip content={t('ui.upNext')}>
      {#snippet trigger(props)}
        <button
          {...props}
          type="button"
          aria-label={t('ui.upNext')}
          aria-pressed={settings.queueOpen}
          class={cn(
            'flex h-7 w-6 items-center justify-center rounded-[4px] max-xl:hidden',
            settings.queueOpen && 'text-accent',
          )}
          onclick={() => (settings.queueOpen = !settings.queueOpen)}
        >
          <ListMusic class="size-5" />
        </button>
      {/snippet}
    </Tooltip>

    {#if !player.isMobile}
      <div
        class="relative size-7 rounded-full max-md:hidden"
        role="group"
        aria-label={t('ui.volume')}
        onpointerenter={() => (volumeOpen = true)}
        onpointerleave={() => (volumeOpen = false)}
        onfocusin={() => (volumeOpen = true)}
        onfocusout={(e) => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node))
            volumeOpen = false
        }}
      >
        <!-- Apple's pop-out: 152x40, grows from the right edge, dense glass -->
        <div
          class={cn(
            'absolute -top-1.5 -right-1 flex h-10 w-[152px] origin-right items-center rounded-full pr-9 pl-2.5 backdrop-blur-[60px] backdrop-saturate-200 transition-[transform,opacity] duration-250',
            'bg-[rgb(246_246_246/0.6)] dark:bg-[rgb(40_40_40/0.6)]',
            volumeOpen
              ? 'pointer-events-auto scale-x-100 opacity-100'
              : 'pointer-events-none scale-x-50 opacity-0',
          )}
        >
          <Slider
            value={level * 100}
            max={100}
            label={t('ui.volume')}
            onValueChange={(v) => (player.volume = v / 100)}
          />
        </div>
        <button
          type="button"
          aria-label={player.muted ? t('ui.unmute') : t('ui.mute')}
          class="relative flex size-full items-center justify-center"
          onclick={() => (player.muted = !player.muted)}
        >
          <VolumeIcon class="size-5" />
        </button>
      </div>
    {/if}
  </div>
</div>
