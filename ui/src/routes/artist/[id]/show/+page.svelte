<script lang="ts">
  // Apple's artist page: a 486px header (190px portrait, 42/50 name, info / play platter /
  // favourite buttons 23px off the bottom), then Top Songs and discography shelves split by
  // MusicBrainz release type, About, and Similar Artists.
  import { Ellipsis, ExternalLink, Info, MicVocal, Play } from '@lucide/svelte'
  import { page } from '$app/state'
  import config from '$lib/config'
  import { artistMenu, fromSubsonic, playTopSongs } from '$lib/actions.svelte'
  import { getList, getOne } from '$lib/api/rest'
  import { coverArtUrl, getArtistInfo, getTopSongs } from '$lib/api/subsonic'
  import type { Song } from '$lib/api/types'
  import { Loader } from '$lib/data.svelte'
  import { artistAlbums, discography, SHELF_TITLE } from '$lib/discography'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { cn } from '$lib/utils/cn'
  import { isLastFmURL } from '$lib/utils/urls'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import AlbumCard from '$lib/components/media/AlbumCard.svelte'
  import ArtistCard from '$lib/components/media/ArtistCard.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import ExpandableText from '$lib/components/media/ExpandableText.svelte'
  import ImageUploadOverlay from '$lib/components/media/ImageUploadOverlay.svelte'
  import Lightbox from '$lib/components/media/Lightbox.svelte'
  import LoveButton from '$lib/components/media/LoveButton.svelte'
  import Rating from '$lib/components/media/Rating.svelte'
  import Shelf from '$lib/components/media/Shelf.svelte'
  import SongGrid from '$lib/components/media/SongGrid.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const id = $derived(page.params.id!)

  const artist = new Loader(
    () => id,
    (id, signal) => getOne('artist', id, { signal }),
    { watch: ['artist'], ids: () => ({ artist: [id] }) },
  )
  const albums = new Loader(() => id, artistAlbums, { watch: ['album'] })
  const info = new Loader(
    () => (config.enableExternalServices ? id : null),
    (id) => getArtistInfo(id),
  )

  const a = $derived(artist.value?.id === id ? artist.value : undefined)
  // undefined while loading keeps the previous page's tint until this one knows its own
  ui.useTint(() => (a ? (a.dominantColor ?? null) : artist.error ? null : undefined))

  /**
   * Top songs come from Last.fm when available; otherwise the artist's most played tracks in the
   * library stand in, so the shelf is never empty for a well-played artist.
   */
  const topSongs = new Loader(
    () => a?.name ?? null,
    async (name, signal): Promise<Song[]> => {
      if (config.enableExternalServices) {
        const external = await getTopSongs(name, 12).catch(() => [])
        if (external.length) return external.map(fromSubsonic)
      }
      const { data } = await getList('song', {
        perPage: 12,
        sort: 'play_count',
        order: 'DESC',
        filter: { artist_id: id, missing: false },
        signal,
      })
      return data
    },
  )

  const shelves = $derived(discography(albums.value?.data ?? [], id))
  const similar = $derived((info.value?.similarArtist ?? []).filter((s) => s.id))
  const bio = $derived(
    (info.value?.biography ?? a?.biography ?? '')
      .replace(/<a [^>]*>Read more on Last\.fm<\/a>\.?/i, '')
      .trim(),
  )
  const lastFm = $derived(info.value?.lastFmUrl || a?.externalUrl)
  const mbid = $derived(a?.mbzArtistId || info.value?.musicBrainzId)

  let starredBy = $state<Record<string, boolean>>({})
  let ratingBy = $state<Record<string, number>>({})
  const starred = $derived(starredBy[id] ?? a?.starred ?? false)

  let lightbox = $state(false)
  let about = $state(false)
  const linkCard =
    'inline-flex h-10 items-center gap-1.5 rounded-xl bg-fill-2 px-4 text-body font-medium text-label hover:bg-fill'

  const playingArtist = $derived(player.currentSong?.albumArtistId === id && !player.paused)
</script>

<PageTitle title={a?.name ?? ''} />

{#if artist.error}
  <EmptyState icon={MicVocal} title={t('ra.page.error')} message={artist.error.message} />
{:else if !a}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else}
  <!-- Header -->
  <header
    class="-mt-8 flex min-h-[486px] flex-col items-center px-10 pt-[94px] pb-[23px] text-center"
  >
    <div
      class="group/art relative size-[190px] shrink-0 rounded-full shadow-[0_10px_30px_rgb(0_0_0/0.3)]"
    >
      <button type="button" class="size-full" aria-label={a.name} onclick={() => (lightbox = true)}>
        <Artwork kind="artist" record={a} size={190} round eager />
      </button>
      <ImageUploadOverlay
        entity="artist"
        id={a.id}
        hasUploadedImage={!!a.uploadedImage}
        onchange={() => artist.reload()}
      />
    </div>
    <div class="flex-1"></div>
    <h1 class="mt-6 text-[42px] leading-[50px] font-bold tracking-tight text-label">{a.name}</h1>
    {#if config.enableStarRating}
      <Rating
        id={a.id}
        size="md"
        class="mt-1"
        bind:rating={() => ratingBy[id] ?? a.rating ?? 0, (v) => (ratingBy[id] = v)}
      />
    {/if}
    <!-- Play stays centred under the name: info on its left, favourite and "..." on its right -->
    <div class="mt-4 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div class="justify-self-end">
        <button
          type="button"
          aria-label={t('ui.about', { _: 'About' })}
          class="glass flex size-9 items-center justify-center rounded-full text-label"
          onclick={() => (about = true)}
        >
          <Info class="size-[18px]" />
        </button>
      </div>
      <button
        type="button"
        aria-label={t('resources.artist.actions.topSongs')}
        class="flex size-14 items-center justify-center rounded-full bg-white text-black/80 shadow-lg transition-transform hover:scale-105 active:scale-95"
        onclick={() =>
          topSongs.value?.length ? player.playTracks(topSongs.value) : playTopSongs(a.name)}
      >
        <Play class="size-6" fill="currentColor" strokeWidth={0} />
      </button>
      <div class="flex items-center gap-4 justify-self-start">
        <LoveButton
          id={a.id}
          size="lg"
          class="glass size-9"
          bind:starred={() => starred, (v) => (starredBy[id] = v)}
        />
        <ActionMenu items={() => artistMenu(a, { starred, onStar: (v) => (starredBy[id] = v) })}>
          {#snippet trigger(props)}
            <button
              {...props}
              aria-label={t('ui.more')}
              class="glass flex size-9 items-center justify-center rounded-full text-label"
            >
              <Ellipsis class="size-[18px]" />
            </button>
          {/snippet}
        </ActionMenu>
      </div>
    </div>
    {#if playingArtist}<span class="sr-only">{t('ui.nowPlaying', { _: 'Now Playing' })}</span>{/if}
  </header>

  {#if topSongs.value?.length}
    <section class="pt-3">
      <h2 class="mb-3 text-[17px] leading-[22px] font-bold text-label">
        {t('resources.artist.actions.topSongs')}
      </h2>
      <SongGrid songs={topSongs.value} rows={Math.min(4, Math.ceil(topSongs.value.length / 3))} />
    </section>
  {/if}

  {#if albums.loading && !albums.value}
    <div class="flex justify-center py-12"><Spinner /></div>
  {/if}
  {#each shelves as shelf (shelf.kind)}
    <Shelf
      class="pt-9"
      title={t(SHELF_TITLE[shelf.kind])}
      href={href(`/artist/${id}/discography/${shelf.kind}`)}
    >
      {#each shelf.albums as album (album.id)}
        <div class="w-[190px]">
          <AlbumCard {album} subtitle={shelf.kind === 'appearsOn' ? 'artist' : 'year'} size={190} />
        </div>
      {/each}
    </Shelf>
  {/each}

  {#if bio || lastFm || mbid}
    <section class="pt-9">
      <h2 class="mb-3 text-[17px] leading-[22px] font-bold text-label">
        {t('ui.aboutArtist', { name: a.name, _: `About ${a.name}` })}
      </h2>
      {#if bio}
        <button
          type="button"
          class="block max-w-3xl rounded-xl bg-fill-2 p-4 text-left hover:bg-fill"
          onclick={() => (about = true)}
        >
          <ExpandableText text={bio} html lines={4} />
        </button>
      {/if}
      <!-- External links as small cards matching the bio's -->
      {#if (lastFm && isLastFmURL(lastFm)) || mbid}
        <div class={cn('flex flex-wrap gap-2', bio && 'mt-3')}>
          {#if lastFm && isLastFmURL(lastFm)}
            <a href={lastFm} target="_blank" rel="noopener noreferrer" class={linkCard}>
              Last.fm <ExternalLink class="size-3.5 text-label-2" />
            </a>
          {/if}
          {#if mbid}
            <a
              href="https://musicbrainz.org/artist/{mbid}"
              target="_blank"
              rel="noopener noreferrer"
              class={linkCard}
            >
              MusicBrainz <ExternalLink class="size-3.5 text-label-2" />
            </a>
          {/if}
        </div>
      {/if}
    </section>
  {/if}

  {#if similar.length}
    <Shelf class="pt-9" title={t('ui.similarArtists')}>
      {#each similar as s (s.id)}
        <div class="w-[150px]">
          <ArtistCard artist={{ id: s.id, name: s.name, albumCount: s.albumCount }} size={150} />
        </div>
      {/each}
    </Shelf>
  {/if}

  <Lightbox bind:open={lightbox} src={coverArtUrl('artist', a)} title={a.name} />

  <Dialog bind:open={about} title={a.name} size="lg">
    {#if bio}
      <div class="prose-sm text-body leading-5 text-label [&_a]:text-accent">
        <ExpandableText text={bio} html lines={1000} />
      </div>
    {:else}
      <p class="text-label-2">{t('ui.noBio', { _: 'No biography available.' })}</p>
    {/if}
  </Dialog>
{/if}
