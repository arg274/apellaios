<script lang="ts">
  import { Heart, ListMusic, Plus, Sparkles } from '@lucide/svelte'
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
</script>

{#snippet group(title: string, items: Playlist[], actions: boolean)}
  <div class="mt-5 mb-1 flex items-center justify-between px-2.5">
    <h2 class="text-subhead font-semibold text-label-3">{title}</h2>
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
{/snippet}

<nav
  aria-label={t('menu.playlists')}
  onclickcapture={(e) => (e.target as HTMLElement).closest('a') && onnavigate?.()}
>
  {@render group(t('menu.playlists'), mine, true)}
  {#if shared.length}
    {@render group(t('menu.sharedPlaylists'), shared, false)}
  {/if}
</nav>
