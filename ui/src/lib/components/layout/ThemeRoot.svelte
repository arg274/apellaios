<script lang="ts">
  // Applies the colour scheme and accent to the document; everything else reads CSS variables
  import { onAccent } from '$lib/accents'
  import { tintAccent } from '$lib/utils/color'
  import { settings } from '$lib/state/settings.svelte'
  import { ui } from '$lib/state/ui.svelte'

  $effect(() => {
    const root = document.documentElement
    // Scheme follows the setting, except that a dark artwork tint forces the dark scheme
    root.classList.toggle('dark', ui.isDark)
    // Tinted pages can take their accent from the artwork; every other page keeps the user's
    const accent = settings.accentPreset
    const fromCover = settings.coverAccent ? tintAccent(ui.tint, ui.isDark) : null
    root.style.setProperty(
      '--accent',
      fromCover?.accent ?? (ui.isDark ? accent.dark : accent.light),
    )
    root.style.setProperty('--on-accent', fromCover?.onAccent ?? onAccent(accent, ui.isDark))
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', ui.tint ?? (ui.isDark ? '#1f1f1f' : '#ffffff'))
  })
</script>
