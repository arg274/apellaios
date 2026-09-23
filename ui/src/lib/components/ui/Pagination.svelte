<script lang="ts">
  import { Pagination } from 'bits-ui'
  import { ChevronLeft, ChevronRight } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'
  import Select from './Select.svelte'

  let {
    page = $bindable(1),
    perPage = $bindable(25),
    pageSize,
    total,
    perPageOptions = [25, 50, 100],
    class: className,
  }: {
    page?: number
    perPage?: number
    /** Rows actually on a page when it differs from the chosen `perPage` (grids fill whole rows) */
    pageSize?: number
    total: number
    perPageOptions?: number[]
    class?: string
  } = $props()

  const size = $derived(pageSize ?? perPage)
  const from = $derived(total === 0 ? 0 : (page - 1) * size + 1)
  const to = $derived(Math.min(page * size, total))
</script>

<div
  class={cn(
    'flex flex-wrap items-center justify-between gap-3 text-callout text-label-2',
    className,
  )}
>
  <div class="flex items-center gap-2">
    <span>{t('ra.navigation.page_rows_per_page')}</span>
    <Select
      value={String(perPage)}
      options={perPageOptions.map((n) => ({ value: String(n), label: String(n) }))}
      class="h-7 min-w-16"
      onValueChange={(v) => {
        perPage = Number(v)
        page = 1
      }}
    />
    <span class="tabular-nums">
      {t('ra.navigation.page_range_info', { offsetBegin: from, offsetEnd: to, total })}
    </span>
  </div>
  {#if total > size}
    <Pagination.Root count={total} perPage={size} bind:page siblingCount={1}>
      {#snippet children({ pages, currentPage })}
        <div class="flex items-center gap-1">
          <Pagination.PrevButton
            class="flex size-7 items-center justify-center rounded-full hover:bg-hover disabled:opacity-30"
            aria-label={t('ra.navigation.prev')}
          >
            <ChevronLeft class="size-4" />
          </Pagination.PrevButton>
          {#each pages as p (p.key)}
            {#if p.type === 'ellipsis'}
              <span class="px-1">…</span>
            {:else}
              <Pagination.Page
                page={p}
                class={cn(
                  'flex h-7 min-w-7 items-center justify-center rounded-full px-2 tabular-nums hover:bg-hover',
                  currentPage === p.value && 'bg-fill font-semibold text-label',
                )}
              >
                {p.value}
              </Pagination.Page>
            {/if}
          {/each}
          <Pagination.NextButton
            class="flex size-7 items-center justify-center rounded-full hover:bg-hover disabled:opacity-30"
            aria-label={t('ra.navigation.next')}
          >
            <ChevronRight class="size-4" />
          </Pagination.NextButton>
        </div>
      {/snippet}
    </Pagination.Root>
  {/if}
</div>
