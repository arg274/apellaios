<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils/cn'

  let {
    title,
    description,
    class: className,
    children,
  }: { title?: string; description?: string; class?: string; children: Snippet } = $props()
</script>

<!-- iOS Settings-style grouped card: a heading above a rounded inset group -->
<section class={cn('flex flex-col gap-2', className)}>
  {#if title}
    <h2 class="px-1 text-subhead font-semibold tracking-wide text-label-2 uppercase">{title}</h2>
  {/if}
  <div class="flex flex-col gap-4 rounded-xl bg-fill-2 p-4 ring-1 ring-divider ring-inset">
    {@render children()}
  </div>
  {#if description}
    <p class="px-1 text-callout text-label-2">{description}</p>
  {/if}
</section>
