<script lang="ts">
  import { FolderSearch, RefreshCw } from '@lucide/svelte'
  import { page } from '$app/state'
  import { getOne, remove, update } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { scanLibraries } from '$lib/scan'
  import { activity } from '$lib/state/activity.svelte'
  import { formatBytes, formatDateTime, formatDuration2, formatNumber } from '$lib/utils/formatters'
  import LibraryFields, {
    libraryServerErrors,
    validateLibrary,
    type LibraryDraft,
    type LibraryErrors,
  } from '$lib/components/forms/LibraryFields.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'

  const id = $derived(page.params.id!)
  const library = new Loader(
    () => id,
    (id, signal) => getOne('library', id, { signal }),
  )
  const lib = $derived(library.value && String(library.value.id) === id ? library.value : undefined)
  // Library 1 is the MusicFolder from the config: it can't move or go away
  const isMain = $derived(id === '1')

  let edits = $state<Record<string, Partial<LibraryDraft>>>({})
  const draft = $derived<LibraryDraft>({
    name: lib?.name ?? '',
    path: lib?.path ?? '',
    defaultNewUsers: lib?.defaultNewUsers ?? false,
    ...edits[id],
  })
  const dirty = $derived(Object.keys(edits[id] ?? {}).length > 0)
  let errors = $state<LibraryErrors>({})

  const stats = $derived(
    lib
      ? [
          ['totalSongs', formatNumber(lib.totalSongs)],
          ['totalAlbums', formatNumber(lib.totalAlbums)],
          ['totalArtists', formatNumber(lib.totalArtists)],
          ['totalFolders', formatNumber(lib.totalFolders)],
          ['totalFiles', formatNumber(lib.totalFiles)],
          ['totalMissingFiles', formatNumber(lib.totalMissingFiles)],
          ['totalSize', formatBytes(lib.totalSize)],
          ['totalDuration', formatDuration2(lib.totalDuration)],
          ['lastScanAt', lib.lastScanAt ? formatDateTime(lib.lastScanAt) : '—'],
          ['updatedAt', formatDateTime(lib.updatedAt)],
          ['createdAt', formatDateTime(lib.createdAt)],
        ]
      : [],
  )

  async function save() {
    errors = validateLibrary(draft)
    if (Object.values(errors).some(Boolean)) return false
    try {
      await update('library', id, {
        ...lib,
        ...draft,
        name: draft.name.trim(),
        path: draft.path.trim(),
      })
    } catch (err) {
      const fields = libraryServerErrors(err)
      if (!fields) throw err
      errors = fields
      return false
    }
    delete edits[id]
  }
</script>

<FormPage
  title={lib
    ? `${t('resources.library.name', { smart_count: 1 })} "${lib.name}"`
    : t('resources.library.name', { smart_count: 1 })}
  backHref={href('/library')}
  loading={!lib}
  {dirty}
  onsave={save}
  ondelete={isMain ? undefined : () => remove('library', id)}
  deleteTitle={t('resources.library.name', { smart_count: 1 })}
  deleteMessage={t('resources.library.messages.deleteConfirm')}
>
  <LibraryFields
    value={draft}
    bind:errors
    pathLocked={isMain}
    onchange={(key, v) => (edits[id] = { ...edits[id], [key]: v })}
  />

  {#snippet aside()}
    {#if lib}
      <h2 class="mb-2 text-callout font-semibold text-label-2 uppercase">
        {t('resources.library.sections.statistics')}
      </h2>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-callout">
        {#each stats as [key, value] (key)}
          <dt class="text-label-2">{t(`resources.library.fields.${key}`)}</dt>
          <dd class="text-right text-label tabular-nums">{value}</dd>
        {/each}
      </dl>
      <div class="mt-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={activity.scanStatus.scanning}
          onclick={() => scanLibraries(false, [lib.id])}
        >
          <RefreshCw class={activity.scanStatus.scanning ? 'animate-spin' : ''} />{t(
            'resources.library.actions.quickScan',
          )}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={activity.scanStatus.scanning}
          onclick={() => scanLibraries(true, [lib.id])}
        >
          <FolderSearch />{t('resources.library.actions.fullScan')}
        </Button>
      </div>
    {/if}
  {/snippet}
</FormPage>
