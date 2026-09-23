<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import { Ellipsis } from '@lucide/svelte'
  import type { Snippet } from 'svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { iconButtonVariants } from '../IconButton.svelte'
  import MenuEntries from './MenuEntries.svelte'
  import { menuContent } from './styles'
  import type { MenuEntry } from './types'

  let {
    items,
    label = t('ui.more'),
    align = 'end',
    side = 'bottom',
    open = $bindable(false),
    triggerClass,
    trigger,
  }: {
    /** Entries, or a function evaluated only when the menu opens */
    items: MenuEntry[] | (() => MenuEntry[])
    label?: string
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'bottom' | 'left' | 'right'
    open?: boolean
    triggerClass?: string
    /** Custom trigger; receives props to spread. Defaults to a "..." icon button */
    trigger?: Snippet<[Record<string, unknown>]>
  } = $props()

  const resolved = $derived(open ? (typeof items === 'function' ? items() : items) : [])
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      {#if trigger}
        {@render trigger(props)}
      {:else}
        <button
          {...props}
          aria-label={label}
          class={iconButtonVariants({ variant: 'ghost', size: 'sm', class: triggerClass })}
        >
          <Ellipsis />
        </button>
      {/if}
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content class={menuContent} {align} {side} sideOffset={4} collisionPadding={8}>
      <MenuEntries items={resolved} />
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
