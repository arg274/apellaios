<script lang="ts">
  import { Checkbox } from 'bits-ui'
  import { Check, Minus } from '@lucide/svelte'
  import { cn } from '$lib/utils/cn'

  let {
    checked = $bindable(false),
    indeterminate = $bindable(false),
    disabled = false,
    id,
    label,
    class: className,
    onCheckedChange,
  }: {
    checked?: boolean
    indeterminate?: boolean
    disabled?: boolean
    id?: string
    label?: string
    class?: string
    onCheckedChange?: (checked: boolean) => void
  } = $props()
</script>

<Checkbox.Root
  bind:checked
  bind:indeterminate
  {disabled}
  {id}
  {onCheckedChange}
  aria-label={label}
  class={cn(
    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-label-3 text-on-accent transition-colors disabled:opacity-40 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
    className,
  )}
>
  {#snippet children({ checked, indeterminate })}
    {#if indeterminate}
      <Minus class="size-3" strokeWidth={3} />
    {:else if checked}
      <Check class="size-3" strokeWidth={3} />
    {/if}
  {/snippet}
</Checkbox.Root>
