<script lang="ts" generics="V extends string">
  import { Select } from 'bits-ui'
  import { Check, ChevronsUpDown } from '@lucide/svelte'
  import { cn } from '$lib/utils/cn'
  import { menuContent, menuItem } from './menu/styles'

  let {
    value = $bindable(),
    options,
    placeholder = '',
    disabled = false,
    id,
    name,
    label,
    class: className,
    onValueChange,
  }: {
    value?: V
    options: { value: V; label: string; disabled?: boolean }[]
    placeholder?: string
    disabled?: boolean
    id?: string
    name?: string
    label?: string
    class?: string
    onValueChange?: (value: V) => void
  } = $props()

  const selectedLabel = $derived(options.find((o) => o.value === value)?.label)
</script>

<Select.Root
  type="single"
  bind:value={value as string}
  onValueChange={(v) => onValueChange?.(v as V)}
  {disabled}
  {name}
  items={options}
>
  <Select.Trigger
    {id}
    aria-label={label}
    class={cn(
      'inline-flex h-8 min-w-32 items-center justify-between gap-2 rounded-lg bg-fill-2 px-3 text-body text-label ring-1 ring-divider ring-inset hover:bg-fill disabled:opacity-40',
      className,
    )}
  >
    <span class={cn('truncate', !selectedLabel && 'text-label-3')}
      >{selectedLabel ?? placeholder}</span
    >
    <ChevronsUpDown class="size-3.5 shrink-0 text-label-2" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content class={cn(menuContent, 'max-h-80')} sideOffset={4} collisionPadding={8}>
      <Select.Viewport>
        {#each options as option (option.value)}
          <Select.Item
            value={option.value}
            label={option.label}
            disabled={option.disabled}
            class={menuItem}
          >
            {#snippet children({ selected })}
              <span class="flex size-4 items-center justify-center">
                {#if selected}<Check />{/if}
              </span>
              <span class="flex-1 truncate">{option.label}</span>
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
