<script lang="ts">
  import '../app.css'
  import { Tooltip } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import { dev } from '$app/environment'
  import config, { shareInfo } from '$lib/config'
  import { i18n } from '$lib/i18n/index.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { activity } from '$lib/state/activity.svelte'
  import { loadUserLibraries } from '$lib/state/libraries'
  import ThemeRoot from '$lib/components/layout/ThemeRoot.svelte'
  import AppShell from '$lib/components/layout/AppShell.svelte'
  import Login from '$lib/components/layout/Login.svelte'
  import SharePlayer from '$lib/components/share/SharePlayer.svelte'
  import Toaster from '$lib/components/ui/Toaster.svelte'

  let { children }: { children: Snippet } = $props()

  const isShare = config.enableSharing && !!shareInfo

  $effect(() => {
    void i18n.init()
    if (!dev && !isShare && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {})
    }
  })

  // Session-scoped work starts on login and stops on logout
  $effect(() => {
    if (isShare || !auth.isAuthenticated) return
    activity.connect()
    void loadUserLibraries()
    return () => activity.disconnect()
  })
</script>

<ThemeRoot />

<Tooltip.Provider>
  {#if isShare && shareInfo}
    <SharePlayer info={shareInfo} />
  {:else if !auth.isAuthenticated}
    <Login />
  {:else}
    <AppShell>
      {@render children()}
    </AppShell>
  {/if}
  <Toaster />
</Tooltip.Provider>
