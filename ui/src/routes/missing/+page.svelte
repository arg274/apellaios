<script lang="ts">
  import { Download, FileQuestion, Trash2 } from '@lucide/svelte'
  import { getAll, removeMany } from '$lib/api/rest'
  import type { MissingFile } from '$lib/api/types'
  import { ListController, Loader, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { formatBytes, formatDateTime } from '$lib/utils/formatters'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('missing', { sort: 'updated_at', order: 'DESC', perPage: 50 })
  const missing = new ListController('missing', () => params.params)
  const libraries = new Loader(
    () => 'libraries',
    () => getAll('library', { sort: 'name', order: 'ASC' }),
  )

  let selected = $state<(string | number)[]>([])
  /** Which removal is being confirmed: the selection or everything */
  let confirming = $state<'selected' | 'all' | null>(null)
  let exporting = $state(false)

  const columns = $derived<DataColumn<MissingFile>[]>([
    {
      id: 'libraryName',
      label: t('resources.missing.fields.libraryName'),
      value: (f) => f.libraryName,
      class: 'max-md:hidden',
      headerClass: 'max-md:hidden',
    },
    {
      id: 'path',
      label: t('resources.missing.fields.path'),
      sort: 'path',
      value: (f) => f.path,
      class: 'font-mono text-callout text-label break-all',
    },
    {
      id: 'size',
      label: t('resources.missing.fields.size'),
      sort: 'size',
      align: 'right',
      value: (f) => formatBytes(f.size),
    },
    {
      id: 'updatedAt',
      label: t('resources.missing.fields.updatedAt'),
      sort: 'updated_at',
      value: (f) => formatDateTime(f.updatedAt),
    },
  ])

  async function removeFiles() {
    // An empty id list asks the server to remove every missing file
    const ids = confirming === 'all' ? [] : selected
    try {
      await removeMany('missing', ids)
      toast.success(t('resources.missing.notifications.removed'))
      selected = []
      missing.reload()
    } catch {
      toast.warning(t('ra.page.error'))
    }
  }

  // The legacy export: one path per line, no header
  async function exportPaths() {
    exporting = true
    try {
      const files = await getAll('missing', { filter: params.filter, sort: 'path', order: 'ASC' })
      const csv = files.map((f) => `"${f.path.replaceAll('"', '""')}"`).join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = 'missing_files.csv'
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      exporting = false
    }
  }
</script>

<PageHeader title={t('resources.missing.name', { smart_count: 2 })}>
  {#snippet actions()}
    {#if (libraries.value?.length ?? 0) > 1}
      <Select
        value={String(params.filter.library_id ?? '')}
        options={[
          { value: '', label: t('ui.any') },
          ...(libraries.value ?? []).map((l) => ({ value: String(l.id), label: l.name })),
        ]}
        label={t('resources.missing.fields.libraryName')}
        class="h-7"
        onValueChange={(v) => params.patchFilter({ library_id: v || undefined })}
      />
    {/if}
    {#if selected.length}
      <Button size="sm" variant="destructive" onclick={() => (confirming = 'selected')}>
        <Trash2 />{t('ra.action.remove')} ({selected.length})
      </Button>
    {/if}
    <Button
      size="sm"
      variant="secondary"
      disabled={!missing.total || exporting}
      onclick={exportPaths}
    >
      <Download />{t('ra.action.export')}
    </Button>
    <Button
      size="sm"
      variant="destructive"
      disabled={!missing.total}
      onclick={() => (confirming = 'all')}
    >
      <Trash2 />{t('resources.missing.actions.remove_all')}
    </Button>
  {/snippet}
</PageHeader>

{#if missing.loading && !missing.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if missing.error}
  <EmptyState icon={FileQuestion} title={t('ra.page.error')} message={missing.error.message} />
{:else if !missing.data.length}
  <EmptyState icon={FileQuestion} title={t('resources.missing.empty')} />
{:else}
  <DataTable
    rows={missing.data}
    {columns}
    loading={missing.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    selectable
    bind:selected
  />

  <Pagination
    class="mt-10"
    total={missing.total}
    bind:page={() => params.page, (v) => (params.page = v)}
    bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
    perPageOptions={[50, 100, 200]}
  />
{/if}

<ConfirmDialog
  bind:open={() => confirming !== null, (v) => !v && (confirming = null)}
  title={t(
    confirming === 'all' ? 'message.remove_all_missing_title' : 'message.remove_missing_title',
  )}
  message={t(
    confirming === 'all' ? 'message.remove_all_missing_content' : 'message.remove_missing_content',
  )}
  danger
  confirmLabel={t('ra.action.remove')}
  onConfirm={removeFiles}
/>
