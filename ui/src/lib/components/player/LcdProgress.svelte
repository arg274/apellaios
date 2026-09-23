<script lang="ts">
  // The chrome player's progress, per Apple's rules: a 2px track (systemQuaternary) with the
  // elapsed part in systemPrimary and no thumb; hovering or dragging expands it to 7px, shows the
  // elapsed/remaining times and dims the rest of the LCD (the parent reads `expanded`).
  import { Slider } from 'bits-ui'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'
  import { formatTrackDuration } from '$lib/utils/formatters'

  let {
    position,
    duration,
    onscrub,
    onseek,
    onexpand,
  }: {
    position: number
    duration: number
    onscrub: (seconds: number | null) => void
    onseek: (seconds: number) => void
    /** Tells the LCD to dim its metadata while the bar is expanded */
    onexpand?: (expanded: boolean) => void
  } = $props()

  let hovering = $state(false)
  let dragging = $state(false)
  const expanded = $derived(hovering || dragging)

  const set = (h: boolean, d: boolean) => {
    const before = hovering || dragging
    hovering = h
    dragging = d
    if (before !== (h || d)) onexpand?.(h || d)
  }
</script>

<!-- Layout height is Apple's 4px + 2px margin + 2px track + 4px; the 7px expanded bar overlays it -->
<div
  class="relative w-full pt-1.5 pb-1"
  role="presentation"
  onpointerenter={() => set(true, dragging)}
  onpointerleave={() => set(false, dragging)}
>
  {#if expanded}
    <div
      class="pointer-events-none absolute inset-x-0 -top-3.5 flex justify-between text-footnote leading-[13px] font-semibold text-label tabular"
    >
      <span>{formatTrackDuration(position)}</span>
      <span>-{formatTrackDuration(Math.max(0, duration - position))}</span>
    </div>
  {/if}
  <div class="relative h-[2px]">
    <Slider.Root
      type="single"
      value={position}
      max={duration || 1}
      step={0.1}
      aria-label={t('ui.seek', { _: 'Seek' })}
      onpointerdown={() => {
        set(hovering, true)
        const up = () => {
          set(hovering, false)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointerup', up)
      }}
      onValueChange={(v) => {
        // bits also reports programmatic updates, so only user drags count as scrubbing
        if (dragging) onscrub(v)
      }}
      onValueCommit={(v) => {
        set(hovering, false)
        onseek(v)
        onscrub(null)
      }}
      class="absolute inset-x-0 top-1/2 flex h-3.5 -translate-y-1/2 touch-none items-center select-none"
    >
      <span
        class={cn(
          'relative w-full overflow-hidden rounded-full bg-fill transition-[height] duration-150',
          expanded ? 'h-[7px]' : 'h-[2px]',
        )}
      >
        <Slider.Range class="absolute h-full bg-label" />
      </span>
      <Slider.Thumb index={0} class="size-0 outline-none" />
    </Slider.Root>
  </div>
</div>
