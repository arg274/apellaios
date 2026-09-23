<script lang="ts">
  // Renders MenuEntry data with bits-ui menu parts. DropdownMenu and ContextMenu share the same
  // underlying item components, so this works inside either kind of content.
  import { DropdownMenu } from 'bits-ui'
  import { Check, ChevronRight } from '@lucide/svelte'
  import { cn } from '$lib/utils/cn'
  import { menuContent, menuItem, menuLabel, menuSeparator } from './styles'
  import type { MenuEntry } from './types'
  import Self from './MenuEntries.svelte'

  let { items }: { items: MenuEntry[] } = $props()
</script>

{#each items as entry, i (i)}
  {#if entry.type === 'separator'}
    <DropdownMenu.Separator class={menuSeparator} />
  {:else if entry.type === 'label'}
    <div class={menuLabel}>{entry.label}</div>
  {:else if entry.type === 'checkbox'}
    <DropdownMenu.CheckboxItem
      class={menuItem}
      checked={entry.checked}
      onCheckedChange={entry.onCheckedChange}
      disabled={entry.disabled}
      closeOnSelect={false}
    >
      {#snippet children({ checked })}
        <span class="flex size-4 items-center justify-center">
          {#if checked}<Check />{/if}
        </span>
        <span class="flex-1 truncate">{entry.label}</span>
      {/snippet}
    </DropdownMenu.CheckboxItem>
  {:else if entry.type === 'asyncSub'}
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger class={menuItem}>
        <span class="flex-1 truncate">{entry.label}</span>
        <ChevronRight class="opacity-60" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent class={menuContent} sideOffset={4}>
        {#await entry.load()}
          <div class={cn(menuItem, 'text-label-3')}>{entry.loadingLabel}</div>
        {:then loaded}
          {#if loaded.length}
            <Self items={loaded} />
          {:else}
            <div class={cn(menuItem, 'text-label-3')}>{entry.emptyLabel}</div>
          {/if}
        {:catch}
          <div class={cn(menuItem, 'text-danger')}>{entry.emptyLabel}</div>
        {/await}
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  {:else if entry.type === 'sub'}
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger class={menuItem} disabled={entry.disabled}>
        <span class="flex-1 truncate">{entry.label}</span>
        <ChevronRight class="opacity-60" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent class={menuContent} sideOffset={4}>
        <Self items={entry.items} />
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  {:else}
    <DropdownMenu.Item
      class={cn(menuItem, entry.danger && 'text-danger data-[highlighted]:bg-danger')}
      disabled={entry.disabled}
      onSelect={entry.onSelect}
    >
      <span class="flex-1 truncate">{entry.label}</span>
      {#if entry.shortcut}
        <kbd class="font-sans text-callout opacity-50">{entry.shortcut}</kbd>
      {/if}
      {#if entry.icon}
        <entry.icon />
      {/if}
    </DropdownMenu.Item>
  {/if}
{/each}
