<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils/cn'

  let {
    label,
    for: htmlFor,
    hint,
    error,
    inline = false,
    class: className,
    children,
  }: {
    label: string
    for?: string
    hint?: string
    error?: string
    /** Label and control on one row (switches, checkboxes) */
    inline?: boolean
    class?: string
    children: Snippet
  } = $props()
</script>

<div
  class={cn(
    inline ? 'flex items-center justify-between gap-4' : 'flex flex-col gap-1.5',
    className,
  )}
>
  <label for={htmlFor} class="text-body font-medium text-label">{label}</label>
  {@render children()}
  {#if error}
    <p class="text-callout text-danger">{error}</p>
  {:else if hint}
    <p class="text-callout text-label-2">{hint}</p>
  {/if}
</div>
