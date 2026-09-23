<script lang="ts">
  import { ChevronRight, Disc3, Ellipsis, Play, Shuffle } from '@lucide/svelte'
  import { page } from '$app/state'
  import config from '$lib/config'
  import { albumMenu, albumSongs, playAll, shuffleAll } from '$lib/actions.svelte'
  import { getList, getOne } from '$lib/api/rest'
  import { coverArtUrl, getAlbumInfo } from '$lib/api/subsonic'
  import { Loader, ListController } from '$lib/data.svelte'
  import { dragMusic } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { albumYears, releaseTypeLabel } from '$lib/media'
  import { href } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { formatDuration2, formatFullDate } from '$lib/utils/formatters'
  import AlbumCard from '$lib/components/media/AlbumCard.svelte'
  import ArtistLinks from '$lib/components/media/ArtistLinks.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import ExpandableText from '$lib/components/media/ExpandableText.svelte'
  import Lightbox from '$lib/components/media/Lightbox.svelte'
  import LoveButton from '$lib/components/media/LoveButton.svelte'
  import QualityBadge from '$lib/components/media/QualityBadge.svelte'
  import Rating from '$lib/components/media/Rating.svelte'
  import Shelf from '$lib/components/media/Shelf.svelte'
  import SongTable from '$lib/components/media/SongTable.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import { iconButtonVariants } from '$lib/components/ui/IconButton.svelte'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import Barcode from '$lib/components/ui/Barcode.svelte'

  const id = $derived(page.params.id!)

  const album = new Loader(
    () => id,
    (id, signal) => getOne('album', id, { signal }),
    { watch: ['album'], ids: () => ({ album: [id] }) },
  )
  const songs = new ListController(
    'song',
    () => ({ perPage: 5000, sort: 'album', order: 'ASC', filter: { album_id: id } }),
    { watch: ['song', 'album'] },
  )
  const info = new Loader(
    () => (config.enableExternalServices ? id : null),
    (id) => getAlbumInfo(id),
  )
  const moreBy = new Loader(
    () => album.value?.albumArtistId,
    (artistId, signal) =>
      getList('album', {
        perPage: 20,
        sort: 'max_year',
        order: 'DESC',
        filter: { artist_id: artistId },
        signal,
      }),
  )

  const a = $derived(album.value?.id === id ? album.value : undefined)
  // undefined while loading keeps the previous page's tint until this one knows its own
  ui.useTint(() => (a ? (a.dominantColor ?? null) : album.error ? null : undefined))

  // Optimistic star/rating changes, keyed by album so navigating away starts clean
  let starredBy = $state<Record<string, boolean>>({})
  let ratingBy = $state<Record<string, number>>({})
  const starred = $derived(starredBy[id] ?? a?.starred ?? false)
  const rating = $derived(ratingBy[id] ?? a?.rating ?? 0)

  let lightbox = $state(false)
  let selected = $state<string[]>([])

  const source = () => albumSongs(id)
  const others = $derived((moreBy.value?.data ?? []).filter((x) => x.id !== id))
  const firstSong = $derived(songs.data[0])
  // Navidrome keeps barcodes on songs, not albums: the first numeric one stands for the release
  // (taggers sometimes write placeholders like "[none]")
  const barcode = $derived(
    songs.data.flatMap((s) => s.tags?.barcode ?? []).find((b) => /^[\d\s-]{7,}$/.test(b)),
  )
  const labels = $derived(a?.tags?.recordlabel ?? [])
  const releaseType = $derived(releaseTypeLabel(a?.tags?.releasetype?.join(';') ?? a?.mbzAlbumType))
  const notes = $derived(info.value?.notes?.trim())
  const playingThis = $derived(player.currentSong?.albumId === id)
  const edition = $derived(a?.tags?.albumversion?.[0])
  const metaLine =
    'mt-1 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-callout leading-[15px] font-semibold text-label-2 md:justify-start'
  // The header shows the first three; the Info dialog lists them all
  const genres = $derived(
    (a?.genres?.length ? a.genres : a?.genre ? [{ id: undefined, name: a.genre }] : []).slice(0, 3),
  )
</script>

<PageTitle title={a?.name ?? ''} />

{#if album.error}
  <EmptyState icon={Disc3} title={t('ra.page.error')} message={album.error.message} />
{:else if !a}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else}
  <!-- Header: artwork left, titles and actions right, as on music.apple.com -->
  <!-- Artwork top at 44px, as measured on music.apple.com (32px shell padding + 12px) -->
  <section class="flex flex-col gap-6 pt-3 md:flex-row md:items-stretch md:gap-8">
    <button
      type="button"
      class="group/art relative w-[min(270px,70vw)] shrink-0 self-center overflow-hidden rounded-art-lg shadow-[0_10px_20px_rgb(0_0_0/0.3)] md:self-auto"
      aria-label={a.name}
      draggable="true"
      ondragstart={dragMusic({ albumIds: [a.id], label: a.name })}
      onclick={() => (lightbox = true)}
    >
      <Artwork kind="album" record={a} size={270} eager class="rounded-art-lg" />
    </button>

    <div class="flex min-w-0 flex-1 flex-col text-center md:text-left">
      <!-- Titles float in the middle of the artwork's height, actions sit on its bottom edge -->
      <div class="hidden flex-1 md:block"></div>
      <!-- Measured on music.apple.com: 26/30 bold title, 26/30 regular artist, 12/15 semibold meta 4px below -->
      <h1 class="mb-px text-[26px] leading-[30px] font-bold text-label">{a.name}</h1>
      <div class="text-[26px] leading-[30px] text-label">
        <ArtistLinks record={a} role="albumartist" linkClass="hover:text-accent" />
      </div>
      <!-- Genres on one line; year, release type and the format chip on the next -->
      {#if genres.length}
        <div class={metaLine}>
          {#each genres as g, i (g.name)}
            {#if i > 0}<span class="-ml-1">,</span>{/if}
            {#if g.id}
              <a
                href={href('/album/all', { filter: JSON.stringify({ genre_id: g.id }) })}
                class="hover:text-label">{g.name}</a
              >
            {:else}
              <span>{g.name}</span>
            {/if}
          {/each}
        </div>
      {/if}
      <div class={metaLine}>
        {#each [albumYears(a), releaseType].filter(Boolean) as part, i (i)}
          {#if i > 0}<span aria-hidden="true">·</span>{/if}
          <span>{part}</span>
        {/each}
        {#if firstSong}
          <QualityBadge song={firstSong} class="ml-1" />
        {/if}
      </div>

      <div class="hidden flex-1 md:block"></div>
      <!-- Editorial notes sit 15px above the buttons; the headings centre in the space above -->
      {#if notes || a.comment}
        <ExpandableText
          text={notes || a.comment || ''}
          html={!!notes}
          lines={3}
          class="mt-4 max-w-[440px] self-center text-left md:mt-0 md:mb-[15px] md:self-start"
        />
      {/if}
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2.5 md:mt-0 md:justify-start">
        <Button size="lg" onclick={playAll(source)}>
          <Play fill="currentColor" />{t('resources.album.actions.playAll')}
        </Button>
        <Button size="lg" variant="secondary" onclick={shuffleAll(source)}>
          <Shuffle />{t('resources.album.actions.shuffle')}
        </Button>
        <div class="flex items-center gap-1 md:ml-auto">
          <Rating id={a.id} bind:rating={() => rating, (v) => (ratingBy[id] = v)} size="md" />
          <LoveButton
            id={a.id}
            size="lg"
            bind:starred={() => starred, (v) => (starredBy[id] = v)}
          />
          <ActionMenu items={() => albumMenu(a, { starred, onStar: (v) => (starredBy[id] = v) })}>
            {#snippet trigger(props)}
              <button
                {...props}
                aria-label={t('ui.more')}
                class={iconButtonVariants({ variant: 'filled', size: 'lg', class: 'text-accent' })}
              >
                <Ellipsis />
              </button>
            {/snippet}
          </ActionMenu>
        </div>
      </div>
    </div>
  </section>

  <section class="mt-10">
    {#if songs.loading && !songs.data.length}
      <div class="flex justify-center py-12"><Spinner /></div>
    {:else}
      <SongTable
        songs={songs.data}
        listKey="albumSong"
        variant="album"
        album={a}
        bind:selected
        columns={[
          'trackNumber',
          'title',
          'artist',
          'composer',
          'year',
          'playCount',
          'playDate',
          'quality',
          'size',
          'channels',
          'bpm',
          'genre',
          'mood',
          'rating',
          'love',
          'duration',
        ]}
        defaultOff={[
          'artist',
          'composer',
          'channels',
          'bpm',
          'year',
          'playCount',
          'playDate',
          'size',
          'mood',
          'genre',
          'quality',
          'rating',
        ]}
        discMenu={(disc) => albumMenu(a, { discNumber: disc })}
      />
    {/if}
  </section>

  {#snippet catalogue()}
    {#if a.catalogNum}<p>{a.catalogNum}</p>{/if}
    <!-- Compact: bars and digits start flush with the text above -->
    {#if barcode}
      <Barcode value={barcode} height={36} moduleWidth={1} compact class="mt-2" />
    {/if}
  {/snippet}

  <!-- Apple's release footer -->
  <section class="mt-[34px] flex flex-col pl-3 text-body leading-[18px] text-label-2">
    {#if a.releaseDate || a.date}
      <p>{formatFullDate(a.releaseDate || a.date || '')}</p>
    {/if}
    <p>
      {t('ui.songs', { smart_count: a.songCount })}, {formatDuration2(a.duration)}
      <!-- The edition ("Deluxe", "Remastered"...) lives here rather than beside the title -->
      {#if edition}· {edition}{/if}
    </p>
    {#if labels.length}
      <!-- As on Apple's album pages: the label gets its own small section below the details, in the
           primary colour with a chevron so it reads as a way through to its label page. The
           catalogue number sits under it. -->
      <div class="mt-[21px]">
        <h2 class="mb-1 text-subhead leading-[14px] font-semibold uppercase">
          {t('ui.recordLabel', { smart_count: labels.length })}
        </h2>
        {#each labels as name (name)}
          <a
            href={href(`/label/${encodeURIComponent(name)}`)}
            class="group/label flex w-fit items-center text-label"
          >
            <span class="group-hover/label:underline">{name}</span>
            <!-- Lucide's chevron spans x 9-15, y 6-18 of its 24-unit box: a 14px box draws a 7px glyph
                 with a ~1.2px stroke, and the margins trim the box's empty sides to a 5px gap -->
            <ChevronRight class="-mr-[5px] size-[14px] shrink-0" strokeWidth={2} />
          </a>
        {/each}
        {@render catalogue()}
      </div>
    {:else}
      {@render catalogue()}
    {/if}
    {#if playingThis}<span class="sr-only">{t('ui.nowPlaying', { _: 'Now Playing' })}</span>{/if}
  </section>

  {#if others.length}
    <!-- Apple sets the shelves on a slightly darker band of the page colour -->
    <Shelf
      class="-mx-4 mt-12 bg-shelf px-4 pt-7 pb-8 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
      title={t('ui.moreBy', { name: a.albumArtist })}
      href={href(`/artist/${a.albumArtistId}/show`)}
    >
      {#each others as other (other.id)}
        <div class="w-[170px]"><AlbumCard album={other} subtitle="year" size={170} /></div>
      {/each}
    </Shelf>
  {/if}

  <Lightbox bind:open={lightbox} src={coverArtUrl('album', a)} title={a.name} />
{/if}
