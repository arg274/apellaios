<script lang="ts">
  import { ContextMenu } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import MenuEntries from './MenuEntries.svelte'
  import { menuContent } from './styles'
  import type { MenuEntry } from './types'

  let {
    items,
    disabled = false,
    children,
  }: {
    /** Entries, or a function evaluated only when the menu opens */
    items: MenuEntry[] | (() => MenuEntry[])
    disabled?: boolean
    /** The right-clickable element; must spread the props it is given */
    children: Snippet<[Record<string, unknown>]>
  } = $props()

  let open = $state(false)
  const resolved = $derived(open ? (typeof items === 'function' ? items() : items) : [])
</script>

{#if disabled}
  {@render children({})}
{:else}
  <ContextMenu.Root bind:open>
    <ContextMenu.Trigger>
      {#snippet child({ props })}
        {@render children(props)}
      {/snippet}
    </ContextMenu.Trigger>
    <ContextMenu.Portal>
      <ContextMenu.Content class={menuContent} collisionPadding={8}>
        <MenuEntries items={resolved} />
      </ContextMenu.Content>
    </ContextMenu.Portal>
  </ContextMenu.Root>
{/if}
