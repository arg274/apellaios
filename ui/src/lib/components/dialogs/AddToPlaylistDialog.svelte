<script lang="ts">
  // Add songs/albums/artists/discs to one or more playlists, creating one inline if the typed
  // name doesn't exist. When single songs are being added, playlists that already contain some
  // of them say so and let the user skip the duplicates.
  import { Check, Plus, Search } from '@lucide/svelte'
  import { addToPlaylist, getPlaylistTrackIds } from '$lib/api/native'
  import { create, getAll } from '$lib/api/rest'
  import type { Playlist } from '$lib/api/types'
  import { canChangeTracks } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { cn } from '$lib/utils/cn'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const request = $derived(ui.addToPlaylist)
  let open = $state(false)
  let playlists = $state<Playlist[]>([])
  let loading = $state(false)
  let query = $state('')
  let busy = $state(false)
  /** Selected playlist ids, plus names of playlists to create */
  let chosen = $state<string[]>([])
  let toCreate = $state<string[]>([])
  /** Per playlist: song ids already present, and whether to skip them */
  let duplicates = $state<Record<string, string[]>>({})
  let skip = $state<Record<string, 'add' | 'skip'>>({})

  // Opening: reset and load the playlists the user can add to
  $effect(() => {
    if (!request) return
    open = true
    query = ''
    chosen = []
    toCreate = []
    duplicates = {}
    skip = {}
    loading = true
    getAll('playlist', { sort: 'name', order: 'ASC' })
      .then((all) => (playlists = all.filter(canChangeTracks)))
      .catch(() => toast.error(t('ra.page.error')))
      .finally(() => (loading = false))
  })

  const shown = $derived(
    query
      ? playlists.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
      : playlists,
  )
  const canCreate = $derived(
    !!query.trim() &&
      !playlists.some((p) => p.name.toLowerCase() === query.trim().toLowerCase()) &&
      !toCreate.includes(query.trim()),
  )

  async function toggle(pls: Playlist) {
    if (chosen.includes(pls.id)) {
      chosen = chosen.filter((id) => id !== pls.id)
      return
    }
    chosen = [...chosen, pls.id]
    const ids = request?.ids
    if (ids?.length && !(pls.id in duplicates)) {
      try {
        const existing = new Set(await getPlaylistTrackIds(pls.id))
        duplicates[pls.id] = ids.filter((id) => existing.has(id))
        skip[pls.id] = 'skip'
      } catch {
        duplicates[pls.id] = []
      }
    }
  }

  function addNew() {
    toCreate = [...toCreate, query.trim()]
    query = ''
  }

  async function submit() {
    if (!request) return
    busy = true
    let total = 0
    try {
      const { label: _label, onSuccess, ...payload } = request
      for (const name of toCreate) {
        const pls = await create('playlist', { name })
        const res = await addToPlaylist(pls.id, payload)
        total += res?.added ?? 0
      }
      for (const id of chosen) {
        const dupes = duplicates[id] ?? []
        const ids =
          skip[id] === 'skip' && payload.ids
            ? payload.ids.filter((x) => !dupes.includes(x))
            : payload.ids
        const res = await addToPlaylist(id, { ...payload, ids })
        total += res?.added ?? 0
      }
      toast.success(t('message.songsAddedToPlaylist', { smart_count: total }))
      onSuccess?.()
      open = false
    } catch {
      toast.error(t('ra.page.error'))
    } finally {
      busy = false
    }
  }
</script>

<Dialog
  bind:open
  title={t('resources.playlist.actions.selectPlaylist')}
  description={request?.label}
  onOpenChange={(v) => {
    if (!v) ui.addToPlaylist = null
  }}
>
  <label class="relative mb-3 block">
    <Search
      class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-label-2"
    />
    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="search"
      bind:value={query}
      autofocus
      placeholder={t('resources.playlist.actions.searchOrCreate')}
      class="h-9 w-full rounded-lg bg-fill-2 pr-3 pl-9 text-body text-label ring-1 ring-divider outline-none ring-inset placeholder:text-label-3 focus:ring-2 focus:ring-accent"
      onkeydown={(e) => {
        if (e.key === 'Enter' && canCreate) addNew()
      }}
    />
  </label>

  <div class="-mx-2 flex max-h-80 flex-col gap-0.5 overflow-y-auto">
    {#if canCreate}
      <button
        type="button"
        class="flex h-12 items-center gap-3 rounded-lg px-2 text-left hover:bg-hover"
        onclick={addNew}
      >
        <span
          class="flex size-10 items-center justify-center rounded-[6px] bg-accent/15 text-accent"
          ><Plus class="size-5" /></span
        >
        <span class="text-body text-accent"
          >{t('resources.playlist.actions.addNewPlaylist', { name: query.trim() })}</span
        >
      </button>
    {/if}
    {#each toCreate as name (name)}
      <button
        type="button"
        class="flex h-12 items-center gap-3 rounded-lg bg-selected px-2 text-left"
        onclick={() => (toCreate = toCreate.filter((n) => n !== name))}
      >
        <span
          class="flex size-10 items-center justify-center rounded-[6px] bg-accent text-on-accent"
          ><Plus class="size-5" /></span
        >
        <span class="flex-1 truncate text-body text-label">{name}</span>
        <Check class="size-4 text-accent" />
      </button>
    {/each}
    {#if loading}
      <div class="flex justify-center py-6"><Spinner /></div>
    {/if}
    {#each shown as pls (pls.id)}
      {@const on = chosen.includes(pls.id)}
      {@const dupes = duplicates[pls.id] ?? []}
      <div class={cn('rounded-lg', on && 'bg-selected')}>
        <button
          type="button"
          class="flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-hover"
          onclick={() => toggle(pls)}
        >
          <div class="size-10 shrink-0"><Artwork kind="playlist" record={pls} size={40} /></div>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-body text-label">{pls.name}</span>
            <span class="block truncate text-callout text-label-2"
              >{t('ui.songs', { smart_count: pls.songCount })}</span
            >
          </span>
          {#if on}<Check class="size-4 text-accent" />{/if}
        </button>
        {#if on && dupes.length}
          <div
            class="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 pl-15 text-callout text-warning"
          >
            <span>{t('resources.playlist.message.song_exist')}</span>
            <SegmentedControl
              size="sm"
              bind:value={() => skip[pls.id] ?? 'skip', (v) => (skip[pls.id] = v)}
              options={[
                { value: 'skip', label: t('ra.action.skip') },
                { value: 'add', label: t('ra.action.add') },
              ]}
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={() => (open = false)}>{t('ra.action.cancel')}</Button>
    <Button disabled={busy || (!chosen.length && !toCreate.length)} onclick={submit}>
      {#if busy}<Spinner class="size-4 text-on-accent" />{/if}
      {t('ra.action.add')}
    </Button>
  {/snippet}
</Dialog>
