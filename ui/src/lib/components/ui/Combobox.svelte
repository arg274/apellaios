<script lang="ts">
  // Searchable picker for filter values (genres, tags, artists). Small option sets are loaded
  // once and filtered locally; large ones pass `search` and query the server as the user types.
  import { Combobox } from 'bits-ui'
  import { Check, ChevronsUpDown, X } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'
  import { debounce } from '$lib/utils/misc'
  import { menuContent, menuItem } from './menu/styles'
  import type { ComboOption } from './combobox'

  let {
    value = $bindable([]),
    multiple = true,
    placeholder = '',
    label,
    options: loadOptions,
    search,
    resolve,
    class: className,
    onValueChange,
  }: {
    /** Selected values; a single-select still uses an array of at most one */
    value?: string[]
    multiple?: boolean
    placeholder?: string
    label?: string
    /** Loads the whole option set once */
    options?: () => Promise<ComboOption[]>
    /** Server-side search for large sets */
    search?: (query: string) => Promise<ComboOption[]>
    /** Looks up labels for selected values not seen in any loaded options (e.g. from the URL) */
    resolve?: (values: string[]) => Promise<ComboOption[]>
    class?: string
    onValueChange?: (value: string[]) => void
  } = $props()

  let all = $state<ComboOption[]>([])
  let found = $state<ComboOption[]>([])
  let query = $state('')
  let open = $state(false)
  // Labels for selected values, remembered so chips stay readable after the list is refiltered
  let labels = $state<Record<string, string>>({})

  const remember = (opts: ComboOption[]) => {
    for (const o of opts) labels[o.value] = o.label
  }

  $effect(() => {
    if (!loadOptions) return
    let cancelled = false
    void loadOptions().then((opts) => {
      if (cancelled) return
      all = opts
      remember(opts)
    })
    return () => {
      cancelled = true
    }
  })

  $effect(() => {
    if (!resolve) return
    const unknown = value.filter((v) => !(v in labels))
    if (!unknown.length) return
    void resolve(unknown).then(remember)
  })

  const runSearch = debounce(async (q: string) => {
    if (!search) return
    const opts = await search(q)
    found = opts
    remember(opts)
  }, 200)

  const shown = $derived(
    search
      ? found
      : query
        ? all.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
        : all,
  )

  function set(next: string[]) {
    value = next
    onValueChange?.(next)
  }
</script>

<div class={cn('flex min-w-0 flex-col gap-1.5', className)}>
  {#if multiple && value.length}
    <div class="flex flex-wrap gap-1">
      {#each value as v (v)}
        <span
          class="inline-flex h-6 items-center gap-1 rounded-full bg-fill pr-1 pl-2.5 text-callout text-label"
        >
          {labels[v] ?? v}
          <button
            type="button"
            aria-label={t('ra.action.remove')}
            class="flex size-4 items-center justify-center rounded-full hover:bg-fill"
            onclick={() => set(value.filter((x) => x !== v))}
          >
            <X class="size-3" />
          </button>
        </span>
      {/each}
    </div>
  {/if}

  {#if multiple}
    <Combobox.Root
      type="multiple"
      bind:open
      {value}
      onValueChange={(v) => {
        set(v)
        query = ''
      }}
      items={shown}
    >
      {@render field()}
    </Combobox.Root>
  {:else}
    <Combobox.Root
      type="single"
      bind:open
      value={value[0] ?? ''}
      onValueChange={(v) => {
        set(v ? [v] : [])
        query = ''
      }}
      items={shown}
    >
      {@render field()}
    </Combobox.Root>
  {/if}
</div>

{#snippet field()}
  <div class="relative">
    <Combobox.Input
      aria-label={label}
      {placeholder}
      defaultValue={!multiple && value[0] ? (labels[value[0]] ?? '') : ''}
      class="h-8 w-full rounded-lg bg-fill-2 pr-8 pl-3 text-body text-label ring-1 ring-divider outline-none ring-inset placeholder:text-label-3 focus:ring-2 focus:ring-accent"
      oninput={(e) => {
        query = e.currentTarget.value
        open = true
        runSearch(query)
      }}
      onfocus={() => {
        if (search && !found.length) runSearch('')
      }}
    />
    {#if !multiple && value[0]}
      <button
        type="button"
        aria-label={t('ra.action.clear_input_value')}
        class="absolute top-1/2 right-7 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-label-3 text-page"
        onclick={() => set([])}
      >
        <X class="size-3" strokeWidth={3} />
      </button>
    {/if}
    <Combobox.Trigger class="absolute top-1/2 right-2 -translate-y-1/2 text-label-2">
      <ChevronsUpDown class="size-3.5" />
    </Combobox.Trigger>
  </div>
  <Combobox.Portal>
    <Combobox.Content
      class={cn(menuContent, 'max-h-72 w-[var(--bits-combobox-anchor-width)]')}
      sideOffset={4}
    >
      {#each shown as option (option.value)}
        <Combobox.Item value={option.value} label={option.label} class={menuItem}>
          {#snippet children({ selected })}
            <span class="flex size-4 items-center justify-center"
              >{#if selected}<Check />{/if}</span
            >
            <span class="flex-1 truncate">{option.label}</span>
          {/snippet}
        </Combobox.Item>
      {:else}
        <div class="px-2.5 py-2 text-callout text-label-3">{t('ra.navigation.no_results')}</div>
      {/each}
    </Combobox.Content>
  </Combobox.Portal>
{/snippet}
