<script lang="ts">
  // One discography shelf of an artist in full, like the page behind an Apple Music artist shelf's
  // chevron: the shelf's name as a 34/40 title, then every release in the grid.
  import { Disc3 } from '@lucide/svelte'
  import { page } from '$app/state'
  import { getOne } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { artistAlbums, discography, isShelfKind, SHELF_TITLE } from '$lib/discography'
  import { t } from '$lib/i18n/index.svelte'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import AlbumGrid from '$lib/components/media/AlbumGrid.svelte'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const id = $derived(page.params.id!)
  const kind = $derived(isShelfKind(page.params.kind) ? page.params.kind : null)

  const artist = new Loader(
    () => id,
    (id, signal) => getOne('artist', id, { signal }),
  )
  const albums = new Loader(() => id, artistAlbums, { watch: ['album'] })

  const shelf = $derived(
    kind ? discography(albums.value?.data ?? [], id).find((s) => s.kind === kind) : undefined,
  )
  const title = $derived(kind ? t(SHELF_TITLE[kind]) : '')
</script>

<PageTitle title={artist.value ? `${artist.value.name} - ${title}` : title} />

{#if !kind || albums.error}
  <EmptyState icon={Disc3} title={t('ra.page.error')} message={albums.error?.message} />
{:else}
  <h1 class="mb-7 truncate text-[34px] leading-10 font-bold text-label">{title}</h1>
  {#if albums.loading && !albums.value}
    <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
  {:else}
    <AlbumGrid
      albums={shelf?.albums ?? []}
      subtitle={kind === 'appearsOn' ? 'artist' : 'year'}
      loading={albums.loading}
    />
  {/if}
{/if}
