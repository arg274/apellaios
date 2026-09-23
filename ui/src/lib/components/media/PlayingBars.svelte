<script lang="ts">
  import { cn } from '$lib/utils/cn'

  let { playing = true, class: className }: { playing?: boolean; class?: string } = $props()
</script>

<!-- Apple's now-playing equaliser: four bars that bounce while playing and settle when paused -->
<span class={cn('inline-flex h-3 items-end gap-[2px] text-accent', className)} aria-hidden="true">
  {#each [0.9, 0.5, 0.75, 0.35] as delay, i (i)}
    <span
      class={cn('w-[2.5px] origin-bottom rounded-full bg-current', playing && 'animate-eq')}
      style:height="{playing ? 100 : 30 + i * 12}%"
      style:animation-delay={playing ? `${-delay}s` : undefined}
    ></span>
  {/each}
</span>
