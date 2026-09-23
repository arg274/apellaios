<script lang="ts">
  // Global keyboard shortcuts, same bindings as the legacy UI (see help.hotkeys in en.json)
  import config from '$lib/config'
  import { toggleStar } from '$lib/actions.svelte'
  import { navigate } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { ui } from '$lib/state/ui.svelte'

  const isTyping = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
  }

  function onkeydown(e: KeyboardEvent) {
    if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
    // Let buttons and menus keep their own Space/Enter handling
    const role = (e.target as HTMLElement | null)?.getAttribute?.('role')
    switch (e.key) {
      case ' ':
        if (
          (e.target as HTMLElement).tagName === 'BUTTON' ||
          role === 'menuitem' ||
          role === 'slider'
        )
          return
        e.preventDefault()
        void player.togglePlay()
        break
      case 'ArrowLeft':
        if (role === 'slider') return
        if (player.hasQueue) player.prev()
        break
      case 'ArrowRight':
        if (role === 'slider') return
        if (player.hasQueue && player.canNext) player.next()
        break
      case '=':
      case '+':
        player.volume = Math.min(1, player.volume + 0.1)
        break
      case '-':
        player.volume = Math.max(0, player.volume - 0.1)
        break
      case 'l':
      case 'L': {
        const song = player.currentSong
        if (config.enableFavourites && song) {
          void toggleStar({ id: song.id, starred: player.details?.starred ?? song.starred })
        }
        break
      }
      case 'C':
        if (e.shiftKey && player.currentSong)
          void navigate(`/album/${player.currentSong.albumId}/show`)
        break
      case 'm':
        ui.mobileNavOpen = !ui.mobileNavOpen
        break
      case '?':
        ui.help = true
        break
    }
  }
</script>

<svelte:window {onkeydown} />
