<script lang="ts">
  import { Search, X } from '@lucide/svelte'
  import config from '$lib/config'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'
  import { debounce } from '$lib/utils/misc'

  let {
    value,
    placeholder = t('ra.action.search'),
    class: className,
    onsearch,
  }: {
    /** The committed query (e.g. from the URL); the field shows it until the user types */
    value: string
    placeholder?: string
    class?: string
    /** Called debounced while typing, and immediately on Enter or clear */
    onsearch: (query: string) => void
  } = $props()

  // Local draft so typing isn't overwritten by the debounced round trip through the URL
  let draft = $state<string | null>(null)
  const shown = $derived(draft ?? value)

  const commit = debounce((q: string) => {
    onsearch(q)
    draft = null
  }, config.uiSearchDebounceMs)
</script>

<label class={cn('relative block w-full sm:w-56', className)}>
  <span class="sr-only">{placeholder}</span>
  <Search
    class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-label-2"
  />
  <input
    type="search"
    value={shown}
    {placeholder}
    class="h-7 w-full rounded-lg bg-fill-2 pr-7 pl-8 text-body text-label ring-1 ring-divider outline-none ring-inset placeholder:text-label-2 focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
    oninput={(e) => {
      draft = e.currentTarget.value
      commit(draft.trim())
    }}
    onkeydown={(e) => {
      if (e.key === 'Enter') {
        commit.cancel()
        onsearch(e.currentTarget.value.trim())
        draft = null
      }
    }}
  />
  {#if shown}
    <button
      type="button"
      aria-label={t('ra.action.clear_input_value')}
      class="absolute top-1/2 right-1.5 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-label-3 text-page"
      onclick={() => {
        commit.cancel()
        draft = null
        onsearch('')
      }}
    >
      <X class="size-3" strokeWidth={3} />
    </button>
  {/if}
</label>
