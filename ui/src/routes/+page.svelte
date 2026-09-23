<script lang="ts">
  import { navigate } from '$lib/nav.svelte'
  import { settings } from '$lib/state/settings.svelte'

  // The app root just forwards to the user's chosen start page
  $effect(() => {
    void navigate(settings.defaultView || '/album/recentlyAdded', { replace: true })
  })
</script>
