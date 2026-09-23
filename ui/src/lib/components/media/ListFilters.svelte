<script lang="ts" module>
  export type FilterField =
    | { key: string; label: string; kind: 'genre'; multiple?: boolean }
    | {
        key: string
        label: string
        kind: 'tag'
        tagName: string
        multiple?: boolean
        format?: (v: string) => string
      }
    | { key: string; label: string; kind: 'artist' }
    | { key: string; label: string; kind: 'bool' }
    | { key: string; label: string; kind: 'number' }
</script>

<script lang="ts">
  // The legacy list filters (genre, tags, artist, flags, year) in one popover, bound to the
  // list's URL params. The trigger shows how many filters are active.
  import { ListFilter } from '@lucide/svelte'
  import { Popover } from 'bits-ui'
  import { getAll, getList, getMany, type Filter } from '$lib/api/rest'
  import { t } from '$lib/i18n/index.svelte'
  import type { UrlListParams } from '$lib/data.svelte'
  import { cn } from '$lib/utils/cn'
  import Button from '$lib/components/ui/Button.svelte'
  import Combobox from '$lib/components/ui/Combobox.svelte'
  import type { ComboOption } from '$lib/components/ui/combobox'
  import Input from '$lib/components/ui/Input.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'

  let {
    params,
    fields,
    /** Keys that belong to the list preset and must not count or be cleared */
    locked = [],
  }: { params: UrlListParams; fields: FilterField[]; locked?: string[] } = $props()

  const active = $derived(
    fields.filter((f) => {
      if (locked.includes(f.key)) return false
      const v = params.filter[f.key]
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
    }).length,
  )

  const asArray = (v: Filter[string]): string[] =>
    v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v.map(String) : [String(v)]

  const genres = async (): Promise<ComboOption[]> =>
    (await getAll('genre', { sort: 'name', order: 'ASC' })).map((g) => ({
      value: g.id,
      label: g.name,
    }))

  const tags =
    (tagName: string, format?: (v: string) => string) => async (): Promise<ComboOption[]> =>
      (await getAll('tag', { sort: 'tagValue', order: 'ASC', filter: { tag_name: tagName } })).map(
        (tg) => ({
          value: tg.id,
          label: format ? format(tg.tagValue) : tg.tagValue,
        }),
      )

  const searchArtists = async (q: string): Promise<ComboOption[]> =>
    (
      await getList('artist', {
        perPage: 50,
        sort: 'name',
        order: 'ASC',
        filter: q ? { name: q } : {},
      })
    ).data.map((a) => ({ value: a.id, label: a.name }))

  const resolveArtists = async (ids: string[]): Promise<ComboOption[]> =>
    (await getMany('artist', ids)).map((a) => ({ value: a.id, label: a.name }))

  const clear = () => {
    const kept: Filter = {}
    for (const key of locked) if (params.filter[key] !== undefined) kept[key] = params.filter[key]
    params.setFilter(kept)
  }

  const tri = (v: Filter[string]) =>
    v === true || v === 'true' ? 'yes' : v === false || v === 'false' ? 'no' : 'any'
</script>

<Popover.Root>
  <Popover.Trigger
    class={cn(
      'inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-callout font-medium transition-colors',
      active ? 'bg-accent text-on-accent' : 'bg-fill text-label hover:bg-fill/80',
    )}
  >
    <ListFilter class="size-3.5" />
    {t('ui.filter')}{#if active}&nbsp;({active}){/if}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      align="end"
      sideOffset={6}
      collisionPadding={12}
      class="glass-menu z-50 flex max-h-[min(70dvh,36rem)] w-80 origin-floating animate-pop flex-col rounded-2xl text-body"
    >
      <div class="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
        {#each fields as field (field.key)}
          <div class="flex flex-col gap-1.5">
            <span class="text-callout font-semibold text-label-2">{field.label}</span>
            {#if field.kind === 'genre'}
              <Combobox
                label={field.label}
                multiple={field.multiple ?? true}
                value={asArray(params.filter[field.key])}
                options={genres}
                onValueChange={(v) => params.patchFilter({ [field.key]: v.length ? v : undefined })}
              />
            {:else if field.kind === 'tag'}
              <Combobox
                label={field.label}
                multiple={field.multiple ?? true}
                value={asArray(params.filter[field.key])}
                options={tags(field.tagName, field.format)}
                onValueChange={(v) =>
                  params.patchFilter({
                    [field.key]: v.length ? (field.multiple === false ? v[0] : v) : undefined,
                  })}
              />
            {:else if field.kind === 'artist'}
              <Combobox
                label={field.label}
                multiple={false}
                value={asArray(params.filter[field.key])}
                search={searchArtists}
                resolve={resolveArtists}
                onValueChange={(v) => params.patchFilter({ [field.key]: v[0] })}
              />
            {:else if field.kind === 'bool'}
              <SegmentedControl
                size="sm"
                value={tri(params.filter[field.key])}
                options={[
                  { value: 'any', label: t('ui.any', { _: 'Any' }) },
                  { value: 'yes', label: t('ra.boolean.true') },
                  { value: 'no', label: t('ra.boolean.false') },
                ]}
                onValueChange={(v) =>
                  params.patchFilter({ [field.key]: v === 'any' ? undefined : v === 'yes' })}
              />
            {:else if field.kind === 'number'}
              <Input
                type="number"
                inputmode="numeric"
                value={params.filter[field.key] === undefined
                  ? ''
                  : String(params.filter[field.key])}
                onchange={(e) => {
                  const n = parseInt(e.currentTarget.value, 10)
                  params.patchFilter({ [field.key]: isNaN(n) ? undefined : n })
                }}
              />
            {/if}
          </div>
        {/each}
      </div>
      {#if active}
        <div class="border-t border-divider p-3">
          <Button variant="plain" size="sm" onclick={clear}>{t('ui.clearFilters')}</Button>
        </div>
      {/if}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
