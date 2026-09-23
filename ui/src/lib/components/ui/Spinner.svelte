<script lang="ts">
  import { cn } from '$lib/utils/cn'

  let { class: className, label = 'Loading' }: { class?: string; label?: string } = $props()
</script>

<!-- Apple's activity indicator: eight fading spokes -->
<span
  role="status"
  aria-label={label}
  class={cn('relative inline-block size-5 text-label-2', className)}
>
  {#each { length: 8 } as _, i (i)}
    <span
      class="absolute top-0 left-[calc(50%-1px)] h-[30%] w-[2px] origin-[50%_166%] rounded-full bg-current"
      style:transform="rotate({i * 45}deg)"
      style:animation="spoke 0.8s linear infinite"
      style:animation-delay="{(i - 8) * 0.1}s"
    ></span>
  {/each}
</span>

<style>
  @keyframes -global-spoke {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.15;
    }
  }
</style>
