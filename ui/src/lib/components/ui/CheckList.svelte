<script lang="ts" generics="K extends string | number">
  // A bordered list of checkable rows with an optional select-all row (user libraries, plugin grants)
  import Checkbox from './Checkbox.svelte'

  let {
    items,
    value,
    selectAllLabel,
    emptyLabel,
    onchange,
  }: {
    items: { id: K; label: string; detail?: string }[]
    value: K[]
    /** Shown as a first row when there's more than one item */
    selectAllLabel?: string
    emptyLabel: string
    onchange: (ids: K[]) => void
  } = $props()

  const selected = $derived(new Set(value))
  const all = $derived(items.length > 0 && items.every((i) => selected.has(i.id)))
  const some = $derived(!all && items.some((i) => selected.has(i.id)))

  const toggle = (id: K, on: boolean) =>
    onchange(on ? [...value, id] : value.filter((v) => v !== id))
</script>

<div class="overflow-hidden rounded-xl ring-1 ring-divider ring-inset">
  {#if selectAllLabel && items.length > 1}
    <label
      class="flex h-9 cursor-pointer items-center gap-3 border-b border-divider px-3 text-body font-medium text-label hover:bg-hover"
    >
      <Checkbox
        checked={all}
        indeterminate={some}
        label={selectAllLabel}
        onCheckedChange={(on) => onchange(on ? items.map((i) => i.id) : [])}
      />
      {selectAllLabel}
    </label>
  {/if}
  <div class="max-h-48 overflow-y-auto">
    {#each items as item (item.id)}
      <label
        class="flex h-9 cursor-pointer items-center gap-3 px-3 text-body text-label hover:bg-hover"
      >
        <Checkbox
          checked={selected.has(item.id)}
          label={item.label}
          onCheckedChange={(on) => toggle(item.id, on)}
        />
        <span class="min-w-0 flex-1 truncate">{item.label}</span>
        {#if item.detail}<span class="truncate text-callout text-label-3">{item.detail}</span>{/if}
      </label>
    {:else}
      <p class="p-4 text-center text-body text-label-2">{emptyLabel}</p>
    {/each}
  </div>
</div>
