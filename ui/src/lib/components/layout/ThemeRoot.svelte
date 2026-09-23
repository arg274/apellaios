<script lang="ts">
  // Applies the colour scheme and accent to the document; everything else reads CSS variables
  import { onAccent } from '$lib/accents'
  import { settings } from '$lib/state/settings.svelte'
  import { ui } from '$lib/state/ui.svelte'

  $effect(() => {
    const root = document.documentElement
    // Scheme follows the setting, except that a dark artwork tint forces the dark scheme
    root.classList.toggle('dark', ui.isDark)
    const accent = settings.accentPreset
    root.style.setProperty('--accent', ui.isDark ? accent.dark : accent.light)
    root.style.setProperty('--on-accent', onAccent(accent, ui.isDark))
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', ui.tint ?? (ui.isDark ? '#1f1f1f' : '#ffffff'))
  })
</script>
