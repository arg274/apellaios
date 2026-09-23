<script lang="ts">
  // Cover art for a shared track. Share pages can't use Artwork: covers come from the share's
  // signed image endpoint, not getCoverArt.
  import { Disc3 } from '@lucide/svelte'
  import { shareCoverUrl } from '$lib/utils/urls'
  import { cn } from '$lib/utils/cn'

  let {
    id,
    alt = '',
    size = 300,
    eager = false,
  }: { id: string | undefined; alt?: string; size?: number; eager?: boolean } = $props()

  const src = $derived(id ? shareCoverUrl(id, true) : undefined)
  let loadedSrc = $state<string>()
  let failedSrc = $state<string>()
</script>

<div
  class="relative aspect-square w-full bg-linear-to-b from-cover-top to-cover-bottom"
  style:max-width="{size}px"
>
  {#if !src || failedSrc === src}
    <div class="absolute inset-0 flex items-center justify-center text-cover-glyph">
      <Disc3 class="size-1/3" strokeWidth={1.25} />
    </div>
  {:else}
    <img
      {src}
      {alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable="false"
      class={cn(
        'absolute inset-0 size-full object-cover transition-opacity duration-300',
        loadedSrc === src ? 'opacity-100' : 'opacity-0',
      )}
      onload={() => (loadedSrc = src)}
      onerror={() => (failedSrc = src)}
    />
  {/if}
</div>
