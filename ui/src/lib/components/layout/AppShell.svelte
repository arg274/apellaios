<script lang="ts">
  import type { Snippet } from 'svelte'
  import { afterNavigate, beforeNavigate } from '$app/navigation'
  import { player } from '$lib/player/player.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { cn } from '$lib/utils/cn'
  import PlayerAudio from '$lib/components/player/PlayerAudio.svelte'
  import PlayerBar from '$lib/components/player/PlayerBar.svelte'
  import QueuePanel from '$lib/components/player/QueuePanel.svelte'
  import NowPlaying from '$lib/components/player/NowPlaying.svelte'
  import DialogHost from '$lib/components/dialogs/DialogHost.svelte'
  import Hotkeys from './Hotkeys.svelte'
  import MobileNav from './MobileNav.svelte'
  import Sidebar from './Sidebar.svelte'

  let { children }: { children: Snippet } = $props()

  let main = $state<HTMLElement | null>(null)
  const tint = $derived(ui.tintColor)
  const queueVisible = $derived(settings.queueOpen && player.hasQueue)

  // The page scrolls inside <main>, not the window, so restore positions by hand on back/forward
  // A plain cache: nothing renders from it
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const scrollPositions = new Map<string, number>()
  beforeNavigate(({ from }) => {
    if (from && main) scrollPositions.set(from.url.hash, main.scrollTop)
  })
  afterNavigate(({ to, type }) => {
    ui.mobileNavOpen = false
    if (!main) return
    const saved = type === 'popstate' && to ? scrollPositions.get(to.url.hash) : undefined
    if (saved === undefined) {
      main.scrollTop = 0
      return
    }
    // Content arrives asynchronously; keep trying until it is tall enough to scroll that far
    const el = main
    let tries = 0
    const restore = () => {
      el.scrollTop = saved
      if (Math.abs(el.scrollTop - saved) > 2 && tries++ < 20) setTimeout(restore, 50)
    }
    restore()
  })
</script>

<PlayerAudio />
<Hotkeys />

<div
  class={cn(
    'relative h-dvh overflow-hidden bg-page transition-[background-color] duration-500',
    tint && 'tinted',
  )}
  style:--tint={tint}
>
  <!-- Desktop sidebar: glass over the (tinted) page, as on music.apple.com -->
  <Sidebar class="fixed inset-y-0 left-0 z-30 hidden lg:flex" />

  <!-- Phone navigation: a glass bar the page scrolls under, opening into a full-screen sheet -->
  <MobileNav />

  <main
    bind:this={main}
    class={cn(
      'h-full overflow-y-auto overscroll-contain pt-topbar lg:pt-0 lg:pl-[260px]',
      queueVisible && 'xl:pr-[320px]',
    )}
  >
    <!-- 32px above page titles, as on music.apple.com -->
    <div class="mx-auto w-full max-w-[1680px] px-4 pb-36 sm:px-6 lg:px-10 lg:pt-8">
      {@render children()}
    </div>
  </main>

  {#if queueVisible}
    <QueuePanel class="fixed inset-y-0 right-0 z-30 hidden w-[320px] xl:flex" />
  {/if}

  {#if player.hasQueue}
    <!-- Apple's .player-bar: 20px from the bottom, 20px inline padding over the content column,
         shifted clear of the Up Next drawer -->
    <div
      class={cn(
        'pointer-events-none fixed right-0 bottom-5 left-0 z-30 flex justify-center px-5 lg:left-[260px]',
        queueVisible && 'xl:pr-[340px]',
      )}
    >
      <PlayerBar class="pointer-events-auto" />
    </div>
  {/if}

  {#if player.expanded && player.current}
    <NowPlaying />
  {/if}
</div>

<DialogHost />
