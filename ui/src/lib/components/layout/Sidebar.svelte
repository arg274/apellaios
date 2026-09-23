<script lang="ts">
  import {
    FolderSearch,
    Library,
    MicVocal,
    Music,
    Puzzle,
    Radio,
    Search,
    Settings2,
    Share2,
    SlidersHorizontal,
    Speaker,
    Users,
  } from '@lucide/svelte'
  import config from '$lib/config'
  import { ALBUM_LISTS } from '$lib/albumLists'
  import { t } from '$lib/i18n/index.svelte'
  import { currentPath, href } from '$lib/nav.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { cn } from '$lib/utils/cn'
  import Brand from './Brand.svelte'
  import LibrarySelector from './LibrarySelector.svelte'
  import NavItem from './NavItem.svelte'
  import { navGap, setNavSheet } from './navSheet'
  import SidebarFooter from './SidebarFooter.svelte'
  import SidebarPlaylists from './SidebarPlaylists.svelte'

  let {
    onnavigate,
    sheet = false,
    class: className,
  }: {
    onnavigate?: () => void
    /** Inside the phone navigation sheet: full width, no logo or material of its own */
    sheet?: boolean
    class?: string
  } = $props()

  setNavSheet(() => sheet)
  const gap = $derived(navGap(sheet))

  const path = $derived(currentPath())
  const is = (p: string) => path === p
  const startsWith = (p: string) => path === p || path.startsWith(p + '/')

  const settingsItems = $derived(
    [
      auth.isAdmin
        ? { path: '/user', label: t('resources.user.name', { smart_count: 2 }), icon: Users }
        : config.enableUserEditing
          ? {
              path: `/user/${auth.user?.id}`,
              label: t('resources.user.name', { smart_count: 1 }),
              icon: Users,
            }
          : null,
      { path: '/player', label: t('resources.player.name', { smart_count: 2 }), icon: Speaker },
      auth.isAdmin && {
        path: '/transcoding',
        label: t('resources.transcoding.name', { smart_count: 2 }),
        icon: SlidersHorizontal,
      },
      auth.isAdmin && {
        path: '/library',
        label: t('resources.library.name', { smart_count: 2 }),
        icon: Library,
      },
      auth.isAdmin && {
        path: '/missing',
        label: t('resources.missing.name', { smart_count: 2 }),
        icon: FolderSearch,
      },
      auth.isAdmin &&
        config.pluginsEnabled && {
          path: '/plugin',
          label: t('resources.plugin.name', { smart_count: 2 }),
          icon: Puzzle,
        },
    ].filter((i): i is { path: string; label: string; icon: typeof Users } => !!i),
  )
</script>

<aside
  class={cn(
    'flex h-full flex-col',
    !sheet && 'w-[260px] border-r border-sidebar-edge glass-sidebar',
    className,
  )}
  aria-label={t('ui.sidebar')}
>
  {#if !sheet}
    <!-- After music.apple.com's 72px logo block inset 8px with 20px side padding, but lowered 10px
         so the 20px-tall logo is centred on the page title row (52px from the top) -->
    <div class="mt-2 ml-2 h-[82px] shrink-0 px-5 pt-[34px]">
      <Brand onclick={onnavigate} />
    </div>
  {/if}

  <div
    class="min-h-0 flex-1 overflow-y-auto pr-3 pb-4 pl-5"
    role="presentation"
    onclickcapture={(e) => (e.target as HTMLElement).closest('a') && onnavigate?.()}
  >
    <nav class={cn('flex flex-col', gap)}>
      <NavItem href={href('/search')} label={t('ui.search')} icon={Search} active={is('/search')} />
    </nav>

    <LibrarySelector />

    <h2 class="mt-3 mb-1 px-2.5 text-subhead font-semibold text-label-3">{t('ui.library')}</h2>
    <nav aria-label={t('ui.library')} class={cn('flex flex-col', gap)}>
      {#each ALBUM_LISTS as list (list.id)}
        <NavItem
          href={href(`/album/${list.id}`)}
          label={t(`resources.album.lists.${list.id}`)}
          icon={list.icon}
          active={is(`/album/${list.id}`)}
        />
      {/each}
      <NavItem
        href={href('/artist')}
        label={t('resources.artist.name', { smart_count: 2 })}
        icon={MicVocal}
        active={startsWith('/artist')}
      />
      <NavItem
        href={href('/song')}
        label={t('resources.song.name', { smart_count: 2 })}
        icon={Music}
        active={startsWith('/song')}
      />
      <NavItem
        href={href('/radio')}
        label={t('resources.radio.name', { smart_count: 2 })}
        icon={Radio}
        active={startsWith('/radio')}
      />
      {#if config.enableSharing}
        <NavItem
          href={href('/share')}
          label={t('resources.share.name', { smart_count: 2 })}
          icon={Share2}
          active={startsWith('/share')}
        />
      {/if}
    </nav>

    {#if config.devSidebarPlaylists}
      <SidebarPlaylists {onnavigate} />
    {:else}
      <nav class="mt-3 flex flex-col gap-0.5">
        <NavItem
          href={href('/playlist')}
          label={t('resources.playlist.name', { smart_count: 2 })}
          icon={Music}
          active={startsWith('/playlist')}
        />
      </nav>
    {/if}

    {#if settingsItems.length}
      <h2
        class="mt-5 mb-1 flex items-center gap-1.5 px-2.5 text-subhead font-semibold text-label-3"
      >
        <Settings2 class="size-3" />
        {t('menu.settings')}
      </h2>
      <nav aria-label={t('menu.settings')} class={cn('flex flex-col', gap)}>
        {#each settingsItems as item (item.path)}
          <NavItem
            href={href(item.path)}
            label={item.label}
            icon={item.icon}
            active={startsWith(item.path)}
          />
        {/each}
      </nav>
    {/if}
  </div>

  <SidebarFooter {onnavigate} />
</aside>
