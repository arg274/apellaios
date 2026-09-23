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

{#snippet note()}
  {#if error}
    <p class="text-callout text-danger">{error}</p>
  {:else if hint}
    <p class="text-callout text-label-2">{hint}</p>
  {/if}
{/snippet}

{#if inline}
  <!-- Label with its note on the left, the control on the right -->
  <div class={cn('flex items-center justify-between gap-4', className)}>
    <div class="flex min-w-0 flex-col gap-0.5">
      <label for={htmlFor} class="text-body font-medium text-label">{label}</label>
      {@render note()}
    </div>
    {@render children()}
  </div>
{:else}
  <div class={cn('flex flex-col gap-1.5', className)}>
    <label for={htmlFor} class="text-body font-medium text-label">{label}</label>
    {@render children()}
    {@render note()}
  </div>
{/if}
