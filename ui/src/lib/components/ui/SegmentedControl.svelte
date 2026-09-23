<script lang="ts" generics="V extends string">
  import { ToggleGroup } from 'bits-ui'
  import type { Component } from 'svelte'
  import { cn } from '$lib/utils/cn'

  let {
    value = $bindable(),
    options,
    label,
    size = 'md',
    class: className,
    onValueChange,
  }: {
    value: V
    options: { value: V; label: string; icon?: Component; iconOnly?: boolean }[]
    label?: string
    size?: 'sm' | 'md'
    class?: string
    onValueChange?: (value: V) => void
  } = $props()
</script>

<!-- Apple's segmented control: a recessed track with a raised pill on the selection -->
<ToggleGroup.Root
  type="single"
  bind:value={
    () => value,
    (v) => {
      // A segmented control always has a selection; ignore attempts to clear it
      if (v) {
        value = v as V
        onValueChange?.(v as V)
      }
    }
  }
  aria-label={label}
  class={cn('inline-flex rounded-lg bg-control p-0.5', className)}
>
  {#each options as option (option.value)}
    <ToggleGroup.Item
      value={option.value}
      aria-label={option.label}
      title={option.iconOnly ? option.label : undefined}
      class={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[6px] font-medium text-label transition-all duration-150 data-[state=on]:bg-control-selected data-[state=on]:shadow-[0_1px_3px_rgb(0_0_0/0.15)] [&_svg]:size-4',
        size === 'sm' ? 'h-6 px-2 text-callout' : 'h-7 px-3 text-body',
      )}
    >
      {#if option.icon}<option.icon />{/if}
      {#if !option.iconOnly}{option.label}{/if}
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>
