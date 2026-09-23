<script lang="ts">
  import { Check, Plus, Users } from '@lucide/svelte'
  import type { User } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { formatDate, formatDateTime } from '$lib/utils/formatters'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import SearchField from '$lib/components/ui/SearchField.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('user', { sort: 'userName', order: 'ASC', perPage: 25 })
  const users = new ListController('user', () => params.params)

  const when = (v?: string) => (v && !v.startsWith('0001') ? formatDateTime(v) : '')

  const columns = $derived<DataColumn<User>[]>([
    {
      id: 'userName',
      label: t('resources.user.fields.userName'),
      sort: 'userName',
      value: (u) => u.userName,
      class: 'text-label',
    },
    { id: 'name', label: t('resources.user.fields.name'), sort: 'name', value: (u) => u.name },
    { id: 'isAdmin', label: t('resources.user.fields.isAdmin'), sort: 'isAdmin', align: 'center' },
    {
      id: 'lastLoginAt',
      label: t('resources.user.fields.lastLoginAt'),
      sort: 'lastLoginAt',
      value: (u) => when(u.lastLoginAt),
    },
    {
      id: 'lastAccessAt',
      label: t('resources.user.fields.lastAccessAt'),
      sort: 'lastAccessAt',
      value: (u) => when(u.lastAccessAt),
      class: 'max-lg:hidden',
      headerClass: 'max-lg:hidden',
    },
    {
      id: 'updatedAt',
      label: t('resources.user.fields.updatedAt'),
      sort: 'updatedAt',
      value: (u) => formatDate(u.updatedAt),
      class: 'max-lg:hidden',
      headerClass: 'max-lg:hidden',
    },
  ])
</script>

<PageHeader title={t('resources.user.name', { smart_count: 2 })}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.name as string) ?? ''}
      onsearch={(q) => params.patchFilter({ name: q || undefined })}
    />
    <Button size="sm" href={href('/user/create')}><Plus />{t('ra.action.create')}</Button>
  {/snippet}
</PageHeader>

{#if users.loading && !users.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if users.error}
  <EmptyState icon={Users} title={t('ra.page.error')} message={users.error.message} />
{:else if !users.data.length}
  <EmptyState icon={Users} title={t('ra.navigation.no_results')} />
{:else}
  <DataTable
    rows={users.data}
    {columns}
    loading={users.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    rowHref={(u) => href(`/user/${u.id}`)}
  >
    {#snippet cell(u, col)}
      {#if col === 'isAdmin' && u.isAdmin}
        <Check class="mx-auto size-4 text-label-2" />
      {/if}
    {/snippet}
  </DataTable>

  <Pagination
    class="mt-10"
    total={users.total}
    bind:page={() => params.page, (v) => (params.page = v)}
    bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
    perPageOptions={[25, 50, 100]}
  />
{/if}
