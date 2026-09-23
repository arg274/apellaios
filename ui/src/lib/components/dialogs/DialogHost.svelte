<script lang="ts">
  // Every app-level dialog, mounted once; each opens when its request in `ui` is set
  import config from '$lib/config'
  import AboutDialog from './AboutDialog.svelte'
  import AddToPlaylistDialog from './AddToPlaylistDialog.svelte'
  import DownloadDialog from './DownloadDialog.svelte'
  import HelpDialog from './HelpDialog.svelte'
  import InfoDialog from './InfoDialog.svelte'
  import ListenBrainzTokenDialog from './ListenBrainzTokenDialog.svelte'
  import QuickConnectDialog from './QuickConnectDialog.svelte'
  import SaveQueueDialog from './SaveQueueDialog.svelte'
  import ShareDialog from './ShareDialog.svelte'
</script>

<AddToPlaylistDialog />
<SaveQueueDialog />
<InfoDialog />
<HelpDialog />
<AboutDialog />
{#if config.enableSharing}<ShareDialog />{/if}
{#if config.enableDownloads}<DownloadDialog />{/if}
{#if config.enableQuickConnect}<QuickConnectDialog />{/if}
{#if config.listenBrainzEnabled}<ListenBrainzTokenDialog />{/if}
