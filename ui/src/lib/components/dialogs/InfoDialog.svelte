<script lang="ts">
  // "Get Info" for a song or an album: details, credits by role, file tags, and (for admins with
  // inspect enabled) the raw tags as read from the file
  import config from '$lib/config'
  import { inspect, type InspectResult } from '$lib/api/native'
  import { session } from '$lib/api/session'
  import type { Album, Role, Song } from '$lib/api/types'
  import { t } from '$lib/i18n/index.svelte'
  import { albumYears, participantsFor, qualityLabel } from '$lib/media'
  import { href } from '$lib/nav.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import {
    formatBytes,
    formatDateTime,
    formatDuration2,
    formatFullDate,
  } from '$lib/utils/formatters'
  import ArtistLinks from '$lib/components/media/ArtistLinks.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import Tabs from '$lib/components/ui/Tabs.svelte'

  const request = $derived(ui.info)
  const isSong = $derived(request?.resource === 'song')
  const song = $derived(isSong ? (request?.record as Song) : undefined)
  const album = $derived(!isSong ? (request?.record as Album | undefined) : undefined)

  let tab = $state('details')
  let raw = $state<InspectResult | null>(null)
  let rawError = $state('')
  let rawLoading = $state(false)

  const canInspect = $derived(isSong && config.enableInspect && session.isAdmin)

  // Fetch raw tags the first time the tab is opened
  $effect(() => {
    if (tab !== 'raw' || !song || raw || rawLoading) return
    rawLoading = true
    inspect(song.id)
      .then((r) => (raw = r))
      .catch((e) => (rawError = (e as Error).message))
      .finally(() => (rawLoading = false))
  })

  function close() {
    ui.info = null
    tab = 'details'
    raw = null
    rawError = ''
  }

  // Album-level tags are shown elsewhere
  const EXCLUDED = new Set([
    'genre',
    'disctotal',
    'tracktotal',
    'releasetype',
    'recordlabel',
    'media',
    'albumversion',
  ])
  const record = $derived((song ?? album) as (Song & Album) | undefined)
  const tags = $derived(Object.entries(record?.tags ?? {}).filter(([k]) => !EXCLUDED.has(k)))
  const roles = $derived(
    Object.keys(record?.participants ?? {}).filter(
      (r) => r !== 'albumartist' && r !== 'artist',
    ) as Role[],
  )

  const rows = $derived.by((): [string, string | undefined][] => {
    if (song) {
      return [
        [t('resources.song.fields.path'), song.path],
        [t('resources.song.fields.libraryName'), song.libraryName],
        [t('resources.song.fields.discSubtitle'), song.discSubtitle],
        [t('resources.song.fields.genre'), song.genres?.map((g) => g.name).join(' • ')],
        [
          t('resources.song.fields.compilation'),
          song.compilation ? t('ra.boolean.true') : undefined,
        ],
        [t('resources.song.fields.quality'), qualityLabel(song)],
        [t('resources.song.fields.bitRate'), song.bitRate ? `${song.bitRate} kbps` : undefined],
        [t('resources.song.fields.bitDepth'), song.bitDepth ? String(song.bitDepth) : undefined],
        [
          t('resources.song.fields.sampleRate'),
          song.sampleRate ? `${song.sampleRate} Hz` : undefined,
        ],
        [t('resources.song.fields.channels'), song.channels ? String(song.channels) : undefined],
        [t('resources.song.fields.duration'), formatDuration2(song.duration)],
        [t('resources.song.fields.size'), formatBytes(song.size)],
        [t('resources.song.fields.bpm'), song.bpm ? String(song.bpm) : undefined],
        [t('resources.song.fields.playCount'), String(song.playCount ?? 0)],
        [
          t('resources.song.fields.playDate'),
          song.playCount && song.playDate ? formatDateTime(song.playDate) : undefined,
        ],
        ...(config.enableReplayGain
          ? ([
              [
                t('resources.song.fields.albumGain'),
                song.rgAlbumGain != null ? `${song.rgAlbumGain} dB` : undefined,
              ],
              [
                t('resources.song.fields.trackGain'),
                song.rgTrackGain != null ? `${song.rgTrackGain} dB` : undefined,
              ],
            ] as [string, string | undefined][])
          : []),
        [t('resources.song.fields.updatedAt'), formatDateTime(song.updatedAt)],
        [t('resources.song.fields.comment'), song.comment],
        ['MusicBrainz', song.mbzRecordingID],
      ]
    }
    if (album) {
      return [
        [
          t('resources.album.fields.releaseDate'),
          album.releaseDate ? formatFullDate(album.releaseDate) : undefined,
        ],
        [
          t('resources.album.fields.originalDate'),
          album.originalDate ? formatFullDate(album.originalDate) : undefined,
        ],
        [t('resources.album.fields.year'), albumYears(album)],
        [t('resources.album.fields.genre'), album.genres?.map((g) => g.name).join(' • ')],
        [t('resources.album.fields.recordLabel'), album.tags?.recordlabel?.join(', ')],
        [t('resources.album.fields.catalogNum'), album.catalogNum],
        [t('resources.album.fields.releaseType'), album.tags?.releasetype?.join(', ')],
        [t('resources.album.fields.media'), album.tags?.media?.join(', ')],
        [t('resources.album.fields.songCount'), String(album.songCount)],
        [t('resources.album.fields.duration'), formatDuration2(album.duration)],
        [t('resources.album.fields.size'), formatBytes(album.size)],
        [t('resources.album.fields.playCount'), String(album.playCount ?? 0)],
        [t('resources.album.fields.libraryName'), album.libraryName],
        [t('resources.album.fields.createdAt'), formatDateTime(album.createdAt)],
        [t('resources.album.fields.updatedAt'), formatDateTime(album.updatedAt)],
        [t('resources.album.fields.comment'), album.comment],
        ['MusicBrainz', album.mbzAlbumId],
      ]
    }
    return []
  })

  const tabs = $derived([
    { value: 'details', label: t('ra.message.details') },
    ...(roles.length ? [{ value: 'credits', label: t('resources.song.fields.participants') }] : []),
    ...(tags.length ? [{ value: 'tags', label: t('resources.song.fields.tags') }] : []),
    ...(canInspect ? [{ value: 'raw', label: t('resources.song.fields.rawTags') }] : []),
  ])
</script>

<Dialog
  bind:open={() => !!request, (v) => !v && close()}
  title={song?.title ?? album?.name ?? ''}
  size="lg"
>
  {#if record}
    <div class="mb-5 flex items-center gap-4">
      <div class="size-16 shrink-0">
        <Artwork kind={isSong ? 'song' : 'album'} {record} size={64} />
      </div>
      <div class="min-w-0 text-body">
        {#if song}
          <a
            href={href(`/album/${song.albumId}/show`)}
            class="block truncate font-semibold text-label hover:underline"
            onclick={close}>{song.album}</a
          >
          <div class="truncate text-label-2"><ArtistLinks record={song} role="artist" /></div>
          {#if song.albumArtist !== song.artist}
            <div class="truncate text-label-3">
              <ArtistLinks record={song} role="albumartist" />
            </div>
          {/if}
        {:else if album}
          <div class="truncate text-label-2"><ArtistLinks record={album} role="albumartist" /></div>
        {/if}
      </div>
    </div>

    <Tabs bind:value={tab} {tabs}>
      {#snippet panel(value)}
        {#if value === 'details'}
          <dl class="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2 text-body">
            {#each rows.filter(([, v]) => v) as [label, value] (label)}
              <dt class="text-label-2">{label}</dt>
              <dd
                class="min-w-0 break-words text-label {label === t('resources.song.fields.path')
                  ? 'font-mono text-callout'
                  : ''}"
              >
                {#if label === 'MusicBrainz'}
                  <a
                    href="https://musicbrainz.org/{isSong ? 'recording' : 'release'}/{value}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-accent hover:underline">{value}</a
                  >
                {:else}
                  {value}
                {/if}
              </dd>
            {/each}
          </dl>
        {:else if value === 'credits'}
          <dl class="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2 text-body">
            {#each roles as role (role)}
              <dt class="text-label-2">
                {t(`resources.artist.roles.${role}`, {
                  smart_count: participantsFor(record.participants, role).length,
                })}
              </dt>
              <dd class="text-label">
                <ArtistLinks {record} {role} linkClass="hover:text-accent" />
              </dd>
            {/each}
          </dl>
        {:else if value === 'tags'}
          <dl class="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2 text-body">
            {#each tags as [name, values] (name)}
              <dt class="font-mono text-callout text-label-2">{name}</dt>
              <dd class="min-w-0 break-words text-label">{values.join(' • ')}</dd>
            {/each}
          </dl>
        {:else if value === 'raw'}
          {#if rawLoading}
            <div class="flex justify-center py-8"><Spinner /></div>
          {:else if rawError}
            <p class="text-danger">{rawError}</p>
          {:else if raw}
            <dl class="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2 text-body">
              {#each Object.entries(raw.rawTags ?? {}) as [name, values] (name)}
                <dt class="font-mono text-callout text-label-2">{name}</dt>
                <dd class="min-w-0 break-words text-label">{values.join(' • ')}</dd>
              {/each}
            </dl>
          {/if}
        {/if}
      {/snippet}
    </Tabs>
  {/if}
</Dialog>
