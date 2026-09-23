<script lang="ts">
  import { Check, Link2, Share2 } from '@lucide/svelte'
  import config from '$lib/config'
  import type { Share } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import { copyText } from '$lib/utils/misc'
  import { shareFormat } from '$lib/utils/share'
  import { sharePlayerUrl } from '$lib/utils/urls'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('share', { sort: 'createdAt', order: 'DESC', perPage: 25 })
  const shares = new ListController('share', () => params.params)

  const expired = (s: Share) => !!s.expiresAt && new Date(s.expiresAt) < new Date()

  const columns = $derived<DataColumn<Share>[]>([
    { id: 'description', label: t('resources.share.fields.description'), sort: 'description' },
    {
      id: 'username',
      label: t('resources.share.fields.username'),
      sort: 'username',
      value: (s) => s.username,
    },
    {
      id: 'format',
      label: t('resources.share.fields.format'),
      value: shareFormat,
      class: 'max-lg:hidden',
      headerClass: 'max-lg:hidden',
    },
    ...(config.enableDownloads
      ? [
          {
            id: 'downloadable',
            label: t('resources.share.fields.downloadable'),
            sort: 'downloadable',
            align: 'center' as const,
          },
        ]
      : []),
    {
      id: 'visitCount',
      label: t('resources.share.fields.visitCount'),
      sort: 'visit_count',
      align: 'right',
      value: (s) => s.visitCount ?? 0,
    },
    {
      id: 'lastVisitedAt',
      label: t('resources.share.fields.lastVisitedAt'),
      sort: 'last_visited_at',
      value: (s) =>
        s.lastVisitedAt && !s.lastVisitedAt.startsWith('0001')
          ? formatDateTime(s.lastVisitedAt)
          : '',
      class: 'max-lg:hidden',
      headerClass: 'max-lg:hidden',
    },
    { id: 'expiresAt', label: t('resources.share.fields.expiresAt'), sort: 'expires_at' },
    { id: 'actions', label: '', class: 'w-12', align: 'right' },
  ])

  async function copyLink(s: Share) {
    const url = sharePlayerUrl(s.id)
    if (await copyText(url)) toast.success(t('message.shareSuccess', { url }))
    else toast.warning(t('message.shareFailure', { url }))
  }
</script>

<PageHeader title={t('resources.share.name', { smart_count: 2 })} />

{#if shares.loading && !shares.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if shares.error}
  <EmptyState icon={Share2} title={t('ra.page.error')} message={shares.error.message} />
{:else if !shares.data.length}
  <EmptyState icon={Share2} title={t('ra.navigation.no_results')} message={t('ui.noSharesHint')} />
{:else}
  <DataTable
    rows={shares.data}
    {columns}
    loading={shares.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    rowHref={(s) => href(`/share/${s.id}`)}
  >
    {#snippet cell(s, col)}
      {#if col === 'description'}
        <div class="min-w-0">
          <div class="truncate text-label">{s.description || s.contents || s.id}</div>
          {#if s.description && s.contents}
            <div class="truncate text-callout text-label-2">{s.contents}</div>
          {/if}
        </div>
      {:else if col === 'downloadable'}
        {#if s.downloadable}<Check class="mx-auto size-4 text-label-2" />{/if}
      {:else if col === 'expiresAt'}
        {#if s.expiresAt}
          <span class={expired(s) ? 'text-danger' : ''}>{formatDateTime(s.expiresAt)}</span>
        {/if}
      {:else if col === 'actions'}
        <IconButton size="sm" label={t('ui.copyLink')} onclick={() => copyLink(s)}
          ><Link2 /></IconButton
        >
      {/if}
    {/snippet}
  </DataTable>

  <Pagination
    class="mt-10"
    total={shares.total}
    bind:page={() => params.page, (v) => (params.page = v)}
    bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
    perPageOptions={[25, 50, 100]}
  />
{/if}
