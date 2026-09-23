<script lang="ts">
  import { MonitorSmartphone } from '@lucide/svelte'
  import { getAll } from '$lib/api/rest'
  import type { Player } from '$lib/api/types'
  import { ListController, Loader, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import SearchField from '$lib/components/ui/SearchField.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('player', { sort: 'lastSeen', order: 'DESC', perPage: 25 })
  const players = new ListController('player', () => params.params)
  const transcodings = new Loader(
    () => 'transcodings',
    () => getAll('transcoding', { sort: 'name', order: 'ASC' }),
  )
  const transcodingName = $derived(
    new Map((transcodings.value ?? []).map((tc) => [tc.id, tc.name])),
  )

  const columns = $derived<DataColumn<Player>[]>([
    {
      id: 'name',
      label: t('resources.player.fields.name'),
      sort: 'name',
      value: (p) => p.name,
      class: 'text-label',
    },
    ...(auth.isAdmin
      ? [
          {
            id: 'userName',
            label: t('resources.player.fields.userName'),
            sort: 'userName',
            value: (p: Player) => p.userName,
          },
        ]
      : []),
    {
      id: 'client',
      label: t('resources.player.fields.client'),
      sort: 'client',
      value: (p) => p.client,
      class: 'max-lg:hidden',
      headerClass: 'max-lg:hidden',
    },
    {
      id: 'transcodingId',
      label: t('resources.player.fields.transcodingId'),
      value: (p) => transcodingName.get(p.transcodingId) ?? '—',
    },
    {
      id: 'maxBitRate',
      label: t('resources.player.fields.maxBitRate'),
      sort: 'maxBitRate',
      align: 'right',
      value: (p) => p.maxBitRate || '—',
    },
    {
      id: 'lastSeen',
      label: t('resources.player.fields.lastSeen'),
      sort: 'lastSeen',
      value: (p) => formatDateTime(p.lastSeen),
    },
  ])
</script>

<PageHeader title={t('resources.player.name', { smart_count: 2 })}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.name as string) ?? ''}
      onsearch={(q) => params.patchFilter({ name: q || undefined })}
    />
  {/snippet}
</PageHeader>

{#if players.loading && !players.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if players.error}
  <EmptyState icon={MonitorSmartphone} title={t('ra.page.error')} message={players.error.message} />
{:else if !players.data.length}
  <EmptyState icon={MonitorSmartphone} title={t('ra.navigation.no_results')} />
{:else}
  <DataTable
    rows={players.data}
    {columns}
    loading={players.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    rowHref={(p) => href(`/player/${p.id}`)}
  />

  <Pagination
    class="mt-10"
    total={players.total}
    bind:page={() => params.page, (v) => (params.page = v)}
    bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
    perPageOptions={[25, 50, 100]}
  />
{/if}
