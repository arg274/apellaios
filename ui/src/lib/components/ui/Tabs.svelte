<script lang="ts">
  import { Tabs } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils/cn'

  let {
    value = $bindable(),
    tabs,
    class: className,
    panel,
  }: {
    value: string
    tabs: { value: string; label: string }[]
    class?: string
    /** Rendered for the selected tab */
    panel: Snippet<[string]>
  } = $props()
</script>

<Tabs.Root bind:value class={cn('flex min-h-0 flex-col', className)}>
  <Tabs.List class="mb-4 flex gap-5 border-b border-divider">
    {#each tabs as tab (tab.value)}
      <Tabs.Trigger
        value={tab.value}
        class="-mb-px border-b-2 border-transparent pb-2 text-body font-semibold text-label-2 transition-colors hover:text-label data-[state=active]:border-accent data-[state=active]:text-label"
      >
        {tab.label}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
  {#each tabs as tab (tab.value)}
    <Tabs.Content value={tab.value} class="min-h-0 flex-1 outline-none">
      {@render panel(tab.value)}
    </Tabs.Content>
  {/each}
</Tabs.Root>
