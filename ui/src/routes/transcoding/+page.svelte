<script lang="ts">
  import { FileAudio, Plus } from '@lucide/svelte'
  import config from '$lib/config'
  import type { Transcoding } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import TranscodingNote from '$lib/components/forms/TranscodingNote.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('transcoding', { sort: 'name', order: 'ASC', perPage: 100 })
  const transcodings = new ListController('transcoding', () => params.params)

  const columns = $derived<DataColumn<Transcoding>[]>([
    {
      id: 'name',
      label: t('resources.transcoding.fields.name'),
      sort: 'name',
      value: (tc) => tc.name,
      class: 'text-label',
    },
    {
      id: 'targetFormat',
      label: t('resources.transcoding.fields.targetFormat'),
      sort: 'targetFormat',
      value: (tc) => tc.targetFormat,
    },
    {
      id: 'defaultBitRate',
      label: t('resources.transcoding.fields.defaultBitRate'),
      sort: 'defaultBitRate',
      align: 'right',
      value: (tc) => tc.defaultBitRate || t('resources.transcoding.choices.noDefaultBitRate'),
    },
    {
      id: 'command',
      label: t('resources.transcoding.fields.command'),
      value: (tc) => tc.command,
      class: 'font-mono text-callout max-md:hidden',
      headerClass: 'max-md:hidden',
    },
  ])
</script>

<PageHeader title={t('resources.transcoding.name', { smart_count: 2 })}>
  {#snippet actions()}
    {#if config.enableTranscodingConfig}
      <Button size="sm" href={href('/transcoding/create')}><Plus />{t('ra.action.create')}</Button>
    {/if}
  {/snippet}
</PageHeader>

{#if config.enableTranscodingConfig}<TranscodingNote />{/if}

{#if transcodings.loading && !transcodings.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if transcodings.error}
  <EmptyState icon={FileAudio} title={t('ra.page.error')} message={transcodings.error.message} />
{:else if !transcodings.data.length}
  <EmptyState icon={FileAudio} title={t('ra.navigation.no_results')} />
{:else}
  <DataTable
    rows={transcodings.data}
    {columns}
    loading={transcodings.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    rowHref={(tc) => href(`/transcoding/${tc.id}`)}
  />
{/if}
