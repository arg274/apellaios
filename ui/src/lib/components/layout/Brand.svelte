<script lang="ts">
  // The logo: the accent-coloured mark and the wordmark, 20px tall, linking home
  import { AudioLines } from '@lucide/svelte'
  import { BRAND } from '$lib/brand'
  import { href } from '$lib/nav.svelte'
  import { cn } from '$lib/utils/cn'

  let { onclick, class: className }: { onclick?: () => void; class?: string } = $props()
</script>

<a href={href('/')} class={cn('flex h-5 items-center gap-1.5 text-label', className)} {onclick}>
  <span class="flex size-5 items-center justify-center rounded-[5px] bg-accent text-on-accent">
    <AudioLines class="size-3.5" strokeWidth={2.75} />
  </span>
  <span class="text-[22px] leading-5 font-normal tracking-[-0.01em]">{BRAND}</span>
</a>
