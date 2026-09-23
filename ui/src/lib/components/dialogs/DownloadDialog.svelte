<script lang="ts">
  import config from '$lib/config'
  import { download } from '$lib/api/subsonic'
  import type { Artist } from '$lib/api/types'
  import { t } from '$lib/i18n/index.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { formatBytes } from '$lib/utils/formatters'
  import Button from '$lib/components/ui/Button.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import TranscodingOptions from './TranscodingOptions.svelte'

  const request = $derived(ui.download)
  let original = $state(true)
  let format = $state(config.defaultDownsamplingFormat)
  let maxBitRate = $state(128)

  // Artist downloads only include the album-artist songs, so that's the size that matters
  const size = $derived.by(() => {
    if (!request) return 0
    if (request.resource === 'artist') {
      const a = request.record as Artist
      return a.stats?.albumartist?.size ?? a.size ?? 0
    }
    return (request.record as { size?: number }).size ?? 0
  })
  const name = $derived(
    request
      ? ((request.record as { name?: string; title?: string }).name ??
          (request.record as { title?: string }).title ??
          '')
      : '',
  )

  function go() {
    if (!request) return
    if (original) download(request.record.id, 'raw')
    else download(request.record.id, format, String(maxBitRate))
    ui.download = null
  }
</script>

<Dialog
  bind:open={() => !!request, (v) => !v && (ui.download = null)}
  title={request
    ? t('message.downloadDialogTitle', {
        resource: t(`resources.${request.resource}.name`, { smart_count: 1 }).toLocaleLowerCase(),
        name,
        size: formatBytes(size),
      })
    : ''}
>
  <div class="flex flex-col gap-4">
    <TranscodingOptions
      bind:original
      bind:format
      bind:maxBitRate
      label={t('message.downloadOriginalFormat')}
    />
  </div>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (ui.download = null)}>{t('ra.action.close')}</Button>
    <Button onclick={go}>{t('ra.action.download')}</Button>
  {/snippet}
</Dialog>
