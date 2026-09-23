<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils/cn'

  let {
    value = $bindable(),
    invalid = false,
    class: className,
    ...rest
  }: HTMLTextareaAttributes & { invalid?: boolean } = $props()
</script>

<textarea
  bind:value
  aria-invalid={invalid || undefined}
  class={cn(
    'min-h-20 w-full rounded-lg bg-fill-2 px-3 py-2 text-body text-label ring-1 ring-divider outline-none ring-inset placeholder:text-label-3 focus:ring-2 focus:ring-accent disabled:opacity-40 aria-[invalid]:ring-danger',
    className,
  )}
  {...rest}></textarea>
