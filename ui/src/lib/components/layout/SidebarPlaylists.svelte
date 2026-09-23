<script lang="ts">
  import { ChevronRight, Heart, ListMusic, Plus, Sparkles } from '@lucide/svelte'
  import { slide } from 'svelte/transition'
  import config from '$lib/config'
  import { addToPlaylist } from '$lib/api/native'
  import { session } from '$lib/api/session'
  import type { Playlist } from '$lib/api/types'
  import { ListController } from '$lib/data.svelte'
  import { canChangeTracks, isMusicDrag, isSmartPlaylist, readMusicDrop } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { currentPath, href } from '$lib/nav.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { cn } from '$lib/utils/cn'
  import NavItem from './NavItem.svelte'
  import { navGap, navSheet } from './navSheet'

  let { onnavigate }: { onnavigate?: () => void } = $props()

  const onlyFavourites = $derived(
    config.enableFavourites && settings.sidebarPlaylistsOnlyFavourites,
  )

  const playlists = new ListController(
    'playlist',
    () => ({
      page: 1,
      perPage: config.maxSidebarPlaylists,
      sort: 'name',
      order: 'ASC',
      filter: onlyFavourites ? { starred: true } : {},
    }),
    { watch: ['playlist'] },
  )

  const mine = $derived(playlists.data.filter((p) => p.ownerId === session.userId))
  const shared = $derived(playlists.data.filter((p) => p.ownerId !== session.userId))

  let dropTarget = $state<string | null>(null)

  // Folding animates, unless the user asked for less motion
  const slideDuration =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : 200

  const dropHandlers = (pls: Playlist) => {
    if (!canChangeTracks(pls)) return {}
    return {
      ondragover: (e: DragEvent) => {
        if (!isMusicDrag(e)) return
        e.preventDefault()
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        dropTarget = pls.id
      },
      ondragleave: () => {
        if (dropTarget === pls.id) dropTarget = null
      },
      ondrop: async (e: DragEvent) => {
        e.preventDefault()
        dropTarget = null
        const payload = readMusicDrop(e)
        if (!payload) return
        try {
          const res = await addToPlaylist(pls.id, payload)
          toast.success(t('message.songsAddedToPlaylist', { smart_count: res?.added ?? 0 }))
          playlists.reload()
        } catch {
          toast.error(t('ra.page.error'))
        }
      },
    }
  }

  const inSheet = navSheet()
  const gap = $derived(navGap(inSheet()))
</script>

{#snippet group(section: string, title: string, items: Playlist[], actions: boolean)}
  {@const open = settings.isSidebarSectionOpen(section)}
  <div class="group/section mt-5 mb-1 flex items-center justify-between px-2.5">
    <!-- The title folds the section; the chevron shows on hover, and always while folded -->
    <h2>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="sidebar-{section}"
        class="-mx-1 flex items-center gap-0.5 rounded-md px-1 text-subhead font-semibold text-label-3 hover:text-label"
        onclick={() => settings.toggleSidebarSection(section)}
      >
        {title}
        <ChevronRight
          class={cn(
            'size-3 transition-[rotate,opacity] duration-200',
            open ? 'rotate-90 opacity-0 group-hover/section:opacity-100' : 'opacity-100',
          )}
          strokeWidth={2.5}
        />
      </button>
    </h2>
    {#if actions}
      <div class="flex items-center gap-0.5">
        {#if config.enableFavourites}
          <button
            type="button"
            title={t('menu.onlyFavourites')}
            aria-label={t('menu.onlyFavourites')}
            aria-pressed={settings.sidebarPlaylistsOnlyFavourites}
            class={cn(
              'flex size-6 items-center justify-center rounded-md text-label-3 hover:bg-hover hover:text-label',
              settings.sidebarPlaylistsOnlyFavourites && 'text-accent hover:text-accent',
            )}
            onclick={() =>
              (settings.sidebarPlaylistsOnlyFavourites = !settings.sidebarPlaylistsOnlyFavourites)}
          >
            <Heart
              class="size-3.5"
              fill={settings.sidebarPlaylistsOnlyFavourites ? 'currentColor' : 'none'}
            />
          </button>
        {/if}
        <a
          href={href('/playlist/create')}
          title={t('ra.action.create')}
          aria-label={t('ra.action.create')}
          class="flex size-6 items-center justify-center rounded-md text-label-3 hover:bg-hover hover:text-label"
          onclick={onnavigate}
        >
          <Plus class="size-3.5" />
        </a>
      </div>
    {/if}
  </div>
  {#if open}
    <div
      id="sidebar-{section}"
      class={cn('flex flex-col', gap)}
      transition:slide={{ duration: slideDuration }}
    >
      {#if actions}
        <NavItem
          href={href('/playlist')}
          label={t('ui.allPlaylists')}
          icon={ListMusic}
          active={currentPath() === '/playlist'}
        />
      {/if}
      {#each items as pls (pls.id)}
        {@const handlers = dropHandlers(pls)}
        <NavItem
          href={href(`/playlist/${pls.id}/show`)}
          label={pls.name}
          icon={isSmartPlaylist(pls) ? Sparkles : ListMusic}
          active={currentPath() === `/playlist/${pls.id}/show`}
          dropTarget={dropTarget === pls.id}
          {...handlers}
        />
      {/each}
    </div>
  {/if}
{/snippet}

<nav
  aria-label={t('menu.playlists')}
  onclickcapture={(e) => (e.target as HTMLElement).closest('a') && onnavigate?.()}
>
  {@render group('playlists', t('menu.playlists'), mine, true)}
  {#if shared.length}
    {@render group('shared', t('menu.sharedPlaylists'), shared, false)}
  {/if}
</nav>
