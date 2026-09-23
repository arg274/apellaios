<script lang="ts">
  import { Search, X } from '@lucide/svelte'
  import config from '$lib/config'
  import { getAll, getList } from '$lib/api/rest'
  import type { Album, Artist, Song } from '$lib/api/types'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { hashQuery, href, setHashQuery } from '$lib/nav.svelte'
  import { debounce } from '$lib/utils/misc'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import AlbumCard from '$lib/components/media/AlbumCard.svelte'
  import ArtistCard from '$lib/components/media/ArtistCard.svelte'
  import GenreTile from '$lib/components/media/GenreTile.svelte'
  import Shelf from '$lib/components/media/Shelf.svelte'
  import SongGrid from '$lib/components/media/SongGrid.svelte'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const query = $derived(hashQuery().get('q')?.trim() ?? '')

  // What's typed, until the debounced URL update catches up
  let draft = $state<string | null>(null)
  const shown = $derived(draft ?? query)
  const commit = debounce((q: string) => {
    void setHashQuery({ q: q || undefined })
    draft = null
  }, config.uiSearchDebounceMs)

  interface Results {
    artists: Artist[]
    albums: Album[]
    songs: Song[]
  }

  const results = new Loader(
    () => query || null,
    async (q, signal): Promise<Results> => {
      const [artists, albums, songs] = await Promise.all([
        getList('artist', { perPage: 20, sort: 'name', order: 'ASC', filter: { name: q }, signal }),
        getList('album', { perPage: 20, sort: 'name', order: 'ASC', filter: { name: q }, signal }),
        getList('song', { perPage: 16, sort: 'title', order: 'ASC', filter: { title: q }, signal }),
      ])
      return { artists: artists.data, albums: albums.data, songs: songs.data }
    },
  )

  const genres = new Loader(
    () => (query ? null : 'genres'),
    () => getAll('genre', { sort: 'name', order: 'ASC' }),
  )

  const nothing = $derived(
    !!results.value &&
      !results.value.artists.length &&
      !results.value.albums.length &&
      !results.value.songs.length,
  )

  // Genre tiles take a stable colour from their name so the grid looks deliberate, not random
  const tileHue = (name: string) => {
    let h = 0
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
    return h
  }
</script>

<PageTitle title={query || t('ui.search')} />

<div class="sticky top-0 z-10 -mx-4 bg-page px-4 pt-2 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
  <label class="relative block max-w-2xl">
    <span class="sr-only">{t('ui.search')}</span>
    <Search
      class="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-label-2"
    />
    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="search"
      value={shown}
      autofocus
      placeholder={t('ui.searchPlaceholder')}
      class="h-11 w-full rounded-xl bg-fill-2 pr-10 pl-11 text-title-3 text-label ring-1 ring-divider outline-none ring-inset placeholder:text-label-3 focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:hidden"
      oninput={(e) => {
        draft = e.currentTarget.value
        commit(draft.trim())
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          commit.cancel()
          void setHashQuery({ q: e.currentTarget.value.trim() || undefined })
          draft = null
        }
      }}
    />
    {#if shown}
      <button
        type="button"
        aria-label={t('ra.action.clear_input_value')}
        class="absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-label-3 text-page"
        onclick={() => {
          commit.cancel()
          draft = null
          void setHashQuery({ q: undefined })
        }}
      >
        <X class="size-3.5" strokeWidth={3} />
      </button>
    {/if}
  </label>
</div>

{#if !query}
  <h2 class="mt-4 mb-4 text-title-2 font-bold text-label">{t('resources.song.fields.genre')}</h2>
  {#if genres.loading && !genres.value}
    <div class="flex justify-center py-12"><Spinner /></div>
  {:else}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
      {#each genres.value ?? [] as genre (genre.id)}
        <GenreTile id={genre.id!} name={genre.name} hue={tileHue(genre.name)} />
      {/each}
    </div>
  {/if}
{:else if results.loading && !results.value}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if nothing}
  <EmptyState icon={Search} title={t('ui.searchNoResults', { query })} />
{:else if results.value}
  <div class="flex flex-col gap-10 pt-2 transition-opacity {results.loading ? 'opacity-60' : ''}">
    {#if results.value.songs.length}
      <section>
        <h2 class="mb-3 text-title-2 font-bold text-label">
          <a
            href={href('/song', { filter: JSON.stringify({ title: query }) })}
            class="hover:opacity-80"
          >
            {t('resources.song.name', { smart_count: 2 })}
          </a>
        </h2>
        <SongGrid songs={results.value.songs} rows={4} subtitle="artist" />
      </section>
    {/if}
    {#if results.value.artists.length}
      <Shelf
        title={t('resources.artist.name', { smart_count: 2 })}
        href={href('/artist', { filter: JSON.stringify({ name: query }) })}
      >
        {#each results.value.artists as artist (artist.id)}
          <div class="w-[150px]"><ArtistCard {artist} size={150} /></div>
        {/each}
      </Shelf>
    {/if}
    {#if results.value.albums.length}
      <Shelf
        title={t('resources.album.name', { smart_count: 2 })}
        href={href('/album/all', { filter: JSON.stringify({ name: query }) })}
      >
        {#each results.value.albums as album (album.id)}
          <div class="w-[170px]"><AlbumCard {album} size={170} /></div>
        {/each}
      </Shelf>
    {/if}
  </div>
{/if}
