<script lang="ts">
  // Apple Music's phone navigation, measured on music.apple.com: a 52px glass bar with a two-bar
  // menu button (44px target, 14px in) and the logo centred. Opening it grows the bar into a
  // full-screen glass sheet listing the sidebar, and the bars turn into a close cross.
  import { t } from '$lib/i18n/index.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { cn } from '$lib/utils/cn'
  import Brand from './Brand.svelte'
  import Sidebar from './Sidebar.svelte'

  const close = () => (ui.mobileNavOpen = false)
  const bar =
    'absolute top-1/2 left-2.5 -mt-px h-0.5 w-6 rounded-[1px] bg-label transition-[translate,rotate] duration-300 ease-apple motion-reduce:transition-none'
</script>

<nav
  class={cn(
    'fixed inset-x-0 top-0 z-40 flex flex-col overflow-hidden border-b border-sidebar-edge glass-sidebar transition-[height] duration-300 ease-apple motion-reduce:transition-none lg:hidden',
    ui.mobileNavOpen ? 'h-dvh' : 'h-topbar',
  )}
  aria-label={t('ui.sidebar')}
>
  <div class="relative flex h-topbar shrink-0 items-center">
    <button
      type="button"
      class="relative ml-3.5 size-11"
      aria-label={ui.mobileNavOpen ? t('ui.closeNav') : t('ui.openNav')}
      aria-expanded={ui.mobileNavOpen}
      aria-controls="mobile-nav-sheet"
      onclick={() => (ui.mobileNavOpen = !ui.mobileNavOpen)}
    >
      <span class={cn(bar, ui.mobileNavOpen ? 'rotate-45' : '-translate-y-1')}></span>
      <span class={cn(bar, ui.mobileNavOpen ? '-rotate-45' : 'translate-y-1')}></span>
    </button>
    <Brand class="absolute left-1/2 -translate-x-1/2" onclick={close} />
  </div>

  {#if ui.mobileNavOpen}
    <div id="mobile-nav-sheet" class="min-h-0 flex-1 animate-fade pt-[17px]">
      <Sidebar sheet onnavigate={close} />
    </div>
  {/if}
</nav>
