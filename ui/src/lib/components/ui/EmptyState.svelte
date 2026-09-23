<script lang="ts">
  import type { Component, Snippet } from 'svelte'

  let {
    icon: Icon,
    title,
    message,
    children,
  }: { icon?: Component; title: string; message?: string; children?: Snippet } = $props()
</script>

<div class="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
  {#if Icon}
    <Icon class="mb-2 size-12 text-label-3" strokeWidth={1.25} />
  {/if}
  <h2 class="text-title-2 font-bold text-label">{title}</h2>
  {#if message}
    <p class="max-w-sm text-body text-label-2">{message}</p>
  {/if}
  {@render children?.()}
</div>
