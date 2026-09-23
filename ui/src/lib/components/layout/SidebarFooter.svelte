<script lang="ts">
  import { Info, Keyboard, LogOut, QrCode, UserCog } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'
  import config from '$lib/config'
  import { t } from '$lib/i18n/index.svelte'
  import { navigate } from '$lib/nav.svelte'
  import { activity } from '$lib/state/activity.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { menuContent, menuItem, menuSeparator } from '$lib/components/ui/menu/styles'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import ActivityPopover from './ActivityPopover.svelte'
  import NowPlayingPopover from './NowPlayingPopover.svelte'

  let { onnavigate }: { onnavigate?: () => void } = $props()

  // Only Gravatar gives a real picture (login sends it when enabled); the server's getAvatar
  // placeholder is the Navidrome logo, so without one draw a generic avatar, coloured like the
  // blank cover
  const avatar = $derived(auth.user?.avatar)
  let avatarFailed = $state(false)
  const showLogout = !config.auth || !!config.extAuthLogoutURL
</script>

<div class="flex shrink-0 items-center gap-1 border-t border-sidebar-edge px-3 py-2.5">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-hover"
    >
      {#if avatar && !avatarFailed}
        <img
          src={avatar}
          alt=""
          class="size-7 shrink-0 rounded-full bg-fill"
          onerror={() => (avatarFailed = true)}
        />
      {:else}
        <svg
          viewBox="0 0 28 28"
          aria-hidden="true"
          class="size-7 shrink-0 rounded-full bg-linear-to-b from-cover-top to-cover-bottom text-cover-glyph"
        >
          <circle cx="14" cy="11" r="5" fill="currentColor" />
          <path d="M4.5 24.5a11 11 0 0 1 19 0 13.5 13.5 0 0 1-19 0z" fill="currentColor" />
        </svg>
      {/if}
      <span class="min-w-0 flex-1">
        <span class="block truncate text-body font-semibold"
          >{auth.user?.name || auth.user?.username}</span
        >
        {#if !activity.serverUp}
          <span class="block truncate text-subhead text-warning">{t('ui.reconnecting')}</span>
        {/if}
      </span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={menuContent} side="top" align="start" sideOffset={6}>
        <DropdownMenu.Item
          class={menuItem}
          onSelect={() => {
            void navigate('/personal')
            onnavigate?.()
          }}
        >
          <span class="flex-1">{t('menu.personal.name')}</span><UserCog />
        </DropdownMenu.Item>
        {#if config.enableQuickConnect}
          <DropdownMenu.Item class={menuItem} onSelect={() => (ui.quickConnect = true)}>
            <span class="flex-1">{t('menu.quickConnect.name')}</span><QrCode />
          </DropdownMenu.Item>
        {/if}
        <DropdownMenu.Item class={menuItem} onSelect={() => (ui.help = true)}>
          <span class="flex-1">{t('help.title')}</span><Keyboard />
        </DropdownMenu.Item>
        <DropdownMenu.Item class={menuItem} onSelect={() => (ui.about = true)}>
          <span class="flex-1">{t('menu.about')}</span><Info />
        </DropdownMenu.Item>
        {#if showLogout}
          <DropdownMenu.Separator class={menuSeparator} />
          <DropdownMenu.Item class={menuItem} onSelect={() => auth.logout()}>
            <span class="flex-1">{t('ra.auth.logout')}</span><LogOut />
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>

  {#if auth.isAdmin && config.devActivityPanel}
    {#if config.enableNowPlaying}<NowPlayingPopover {onnavigate} />{/if}
    <ActivityPopover />
  {:else if activity.scanStatus.scanning}
    <Spinner class="size-4" />
  {/if}
</div>
