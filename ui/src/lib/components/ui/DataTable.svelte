<script lang="ts" generics="T extends { id: string | number }">
  // A plain record table for non-song resources (users, players, libraries, shares...). Columns
  // are data plus an optional cell snippet; rows can be clickable, sortable and selectable.
  import { ArrowDown, ArrowUp } from '@lucide/svelte'
  import type { Snippet } from 'svelte'
  import type { SortOrder } from '$lib/api/rest'
  import { cn } from '$lib/utils/cn'
  import Checkbox from './Checkbox.svelte'
  import type { DataColumn } from './dataTable'

  let {
    rows,
    columns,
    cell,
    sort,
    order,
    onsort,
    onrowclick,
    rowHref,
    selectable = false,
    selected = $bindable([]),
    loading = false,
    class: className,
    empty,
  }: {
    rows: T[]
    columns: DataColumn<T>[]
    /** Renders columns that have no `value`: receives the row and the column id */
    cell?: Snippet<[T, string]>
    sort?: string
    order?: SortOrder
    onsort?: (field: string) => void
    onrowclick?: (row: T) => void
    /** Makes the whole row a link */
    rowHref?: (row: T) => string
    selectable?: boolean
    selected?: (string | number)[]
    loading?: boolean
    class?: string
    empty?: Snippet
  } = $props()

  const selectedSet = $derived(new Set(selected))
  const allSelected = $derived(rows.length > 0 && rows.every((r) => selectedSet.has(r.id)))
  const someSelected = $derived(!allSelected && rows.some((r) => selectedSet.has(r.id)))

  const toggleAll = (on: boolean) => (selected = on ? rows.map((r) => r.id) : [])
  const toggle = (id: string | number, on: boolean) =>
    (selected = on ? [...selected, id] : selected.filter((x) => x !== id))

  const align = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  function activate(row: T, e: MouseEvent) {
    if ((e.target as HTMLElement).closest('a,button,input,[role=checkbox],[role=switch]')) return
    if (rowHref) location.hash = rowHref(row)
    else onrowclick?.(row)
  }
</script>

{#if rows.length === 0 && !loading}
  {@render empty?.()}
{:else}
  <div class={cn('overflow-x-auto transition-opacity', loading && 'opacity-60', className)}>
    <table class="w-full border-collapse text-body">
      <thead>
        <tr class="h-8 border-b border-divider text-subhead font-semibold text-label-2">
          {#if selectable}
            <th class="w-10 pl-3">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={toggleAll}
                label="Select all"
              />
            </th>
          {/if}
          {#each columns as col (col.id)}
            <th
              class={cn('px-3 font-semibold whitespace-nowrap', align(col.align), col.headerClass)}
            >
              {#if col.sort && onsort}
                <button
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-label"
                  onclick={() => onsort?.(col.sort!)}
                >
                  {col.label}
                  {#if sort === col.sort}
                    {#if order === 'ASC'}<ArrowUp class="size-3" />{:else}<ArrowDown
                        class="size-3"
                      />{/if}
                  {/if}
                </button>
              {:else}
                {col.label}
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr
            class={cn(
              'h-11 border-b border-divider text-label-2',
              (onrowclick || rowHref) && 'cursor-pointer hover:bg-hover',
              selectedSet.has(row.id) && 'bg-accent/15',
            )}
            onclick={(e) => activate(row, e)}
          >
            {#if selectable}
              <td class="pl-3">
                <Checkbox
                  checked={selectedSet.has(row.id)}
                  onCheckedChange={(v) => toggle(row.id, v)}
                />
              </td>
            {/if}
            {#each columns as col, i (col.id)}
              <td class={cn('px-3', align(col.align), i === 0 && 'text-label', col.class)}>
                {#if col.value}
                  {col.value(row) ?? ''}
                {:else if cell}
                  {@render cell(row, col.id)}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
