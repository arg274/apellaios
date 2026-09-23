<script lang="ts">
  import { Library } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'
  import { t } from '$lib/i18n/index.svelte'
  import { librarySelection } from '$lib/state/library.svelte'
  import Checkbox from '$lib/components/ui/Checkbox.svelte'
  import { menuContent, menuItem, menuLabel, menuSeparator } from '$lib/components/ui/menu/styles'

  const libs = $derived(librarySelection.userLibraries)
  const selected = $derived(librarySelection.filterIds)
  const allSelected = $derived(selected.length === 0 || selected.length === libs.length)
  const summary = $derived(
    allSelected
      ? t('menu.librarySelector.allLibraries', { count: libs.length, _: 'All libraries' })
      : selected.length === 1
        ? (libs.find((l) => l.id === selected[0])?.name ?? '')
        : t('menu.librarySelector.multipleLibraries', {
            selected: selected.length,
            total: libs.length,
            _: `${selected.length} of ${libs.length} libraries`,
          }),
  )

  function toggle(id: number, on: boolean) {
    const current = selected.length ? selected : libs.map((l) => l.id)
    const next = on ? [...new Set([...current, id])] : current.filter((x) => x !== id)
    // Never allow an empty selection: that would silently mean "everything"
    if (next.length) librarySelection.setSelected(next)
  }
</script>

{#if librarySelection.hasMultiple}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="mb-1 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body text-label-2 hover:bg-hover"
    >
      <Library class="size-4 shrink-0" />
      <span class="min-w-0 flex-1 truncate">{summary}</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={menuContent} align="start" sideOffset={4}>
        <div class={menuLabel}>{t('menu.librarySelector.selectLibraries', { _: 'Libraries' })}</div>
        {#each libs as lib (lib.id)}
          {@const on = allSelected || selected.includes(lib.id)}
          <DropdownMenu.Item
            class={menuItem}
            closeOnSelect={false}
            onSelect={() => toggle(lib.id, !on)}
          >
            <Checkbox checked={on} class="pointer-events-none" />
            <span class="flex-1 truncate">{lib.name}</span>
          </DropdownMenu.Item>
        {/each}
        <DropdownMenu.Separator class={menuSeparator} />
        <DropdownMenu.Item
          class={menuItem}
          onSelect={() => librarySelection.setSelected(libs.map((l) => l.id))}
        >
          {t('ui.selectAll')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
{/if}
