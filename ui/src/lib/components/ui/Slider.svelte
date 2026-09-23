<script lang="ts">
  import { Slider } from 'bits-ui'
  import { cn } from '$lib/utils/cn'

  let {
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    label,
    /** Secondary fill behind the value, e.g. buffered audio */
    buffered,
    class: className,
    onValueChange,
    onValueCommit,
  }: {
    value?: number
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    label?: string
    buffered?: number
    class?: string
    onValueChange?: (value: number) => void
    onValueCommit?: (value: number) => void
  } = $props()

  // Not reactive: it only gates the value setter below
  let interacting = false

  const bufferedPct = $derived(
    buffered !== undefined && max > min ? ((buffered - min) / (max - min)) * 100 : 0,
  )
</script>

<!-- Apple's thin scrubber: the thumb only appears on hover or drag -->
<!-- bits-ui also calls the setter to snap an outside value to `step`, so only changes made while
     the user holds or keys the slider count as input; a moving playhead never reads as a scrub -->
<Slider.Root
  type="single"
  bind:value={
    () => value,
    (v) => {
      value = v
      if (interacting) onValueChange?.(v)
    }
  }
  {min}
  {max}
  {step}
  {disabled}
  onpointerdown={() => (interacting = true)}
  onkeydown={() => (interacting = true)}
  onValueCommit={(v) => {
    interacting = false
    onValueCommit?.(v)
  }}
  aria-label={label}
  class={cn(
    'group relative flex h-4 w-full touch-none items-center select-none disabled:opacity-40',
    className,
  )}
>
  <span class="relative h-[3px] w-full grow overflow-hidden rounded-full bg-fill">
    {#if buffered !== undefined}
      <span class="absolute inset-y-0 left-0 bg-fill" style:width="{bufferedPct}%"></span>
    {/if}
    <Slider.Range class="absolute h-full bg-label-2 group-hover:bg-label" />
  </span>
  <Slider.Thumb
    index={0}
    class="block size-3 scale-0 rounded-full bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.2),0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-150 group-hover:scale-100 focus-visible:scale-100 data-[active]:scale-110"
  />
</Slider.Root>
