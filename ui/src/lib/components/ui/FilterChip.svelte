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

<!-- A toggleable filter pill, filled with the key colour while active -->
<button
  type="button"
  aria-pressed={active}
  class={cn(
    'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-callout font-medium transition-colors [&_svg]:size-3.5',
    active ? 'bg-accent text-on-accent' : 'bg-fill text-label hover:bg-fill/80',
  )}
  {onclick}
>
  {#if Icon}<Icon fill={active ? 'currentColor' : 'none'} />{/if}
  {label}
</button>
