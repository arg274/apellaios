<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils/cn'

  let {
    value = $bindable(),
    ref = $bindable(null),
    invalid = false,
    class: className,
    ...rest
  }: HTMLInputAttributes & { ref?: HTMLInputElement | null; invalid?: boolean } = $props()
</script>

<input
  bind:value
  bind:this={ref}
  aria-invalid={invalid || undefined}
  class={cn(
    'h-8 w-full rounded-lg bg-fill-2 px-3 text-body text-label ring-1 ring-divider outline-none ring-inset placeholder:text-label-3 focus:ring-2 focus:ring-accent disabled:opacity-40 aria-[invalid]:ring-danger',
    className,
  )}
  {...rest}
/>
