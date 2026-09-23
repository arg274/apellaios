<script lang="ts">
  import type { Component } from 'svelte'
  import { cn } from '$lib/utils/cn'

  let {
    label,
    icon: Icon,
    active = false,
    onclick,
  }: { label: string; icon?: Component; active?: boolean; onclick: () => void } = $props()
</script>

<!-- A toggleable filter, shaped like the selects beside it and filled with the key colour while
     active. On phones only its icon shows, so a list's toolbar fits on one line -->
<button
  type="button"
  aria-pressed={active}
  class={cn(
    'inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-callout font-medium transition-colors [&_svg]:size-3.5',
    active ? 'bg-accent text-on-accent' : 'bg-fill text-label hover:bg-fill/80',
    Icon && 'max-sm:size-7 max-sm:justify-center max-sm:px-0',
  )}
  {onclick}
>
  {#if Icon}<Icon fill={active ? 'currentColor' : 'none'} />{/if}
  <span class={cn(Icon && 'max-sm:sr-only')}>{label}</span>
</button>
