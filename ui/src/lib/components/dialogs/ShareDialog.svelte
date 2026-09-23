<script lang="ts">
  // Creates a public share, then shows its link with a copy button (the clipboard can be
  // unavailable on plain-http servers, so the URL is always visible and selectable too)
  import { Check, Copy } from '@lucide/svelte'
  import config from '$lib/config'
  import { create } from '$lib/api/rest'
  import { t } from '$lib/i18n/index.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { copyText } from '$lib/utils/misc'
  import { sharePlayerUrl } from '$lib/utils/urls'
  import Button from '$lib/components/ui/Button.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'
  import TranscodingOptions from './TranscodingOptions.svelte'

  const request = $derived(ui.share)

  let description = $state('')
  let downloadable = $state(config.defaultDownloadableShare && config.enableDownloads)
  let original = $state(true)
  let format = $state(config.defaultDownsamplingFormat)
  let maxBitRate = $state(128)
  let url = $state('')
  let copied = $state(false)
  let busy = $state(false)

  const title = $derived.by(() => {
    if (!request) return ''
    const resource = t(`resources.${request.resource}.name`, {
      smart_count: request.ids.length,
    }).toLocaleLowerCase()
    return request.ids.length > 1 || !request.name
      ? t('message.shareBatchDialogTitle', { resource, smart_count: request.ids.length })
      : t('message.shareDialogTitle', { resource, name: request.name })
  })

  function reset() {
    description = ''
    url = ''
    copied = false
  }

  async function share() {
    if (!request) return
    busy = true
    try {
      const created = await create('share', {
        resourceType: request.resource,
        resourceIds: request.ids.join(','),
        description,
        downloadable,
        ...(!original && { format, maxBitRate }),
      })
      url = sharePlayerUrl(created.id)
      copied = await copyText(url)
    } catch (e) {
      toast.error(`${t('ra.page.error')}: ${(e as Error).message}`)
    } finally {
      busy = false
    }
  }

  async function copy() {
    copied = await copyText(url)
  }
</script>

<Dialog
  bind:open={
    () => !!request,
    (v) => {
      if (!v) {
        ui.share = null
        reset()
      }
    }
  }
  {title}
>
  {#if url}
    <div class="flex flex-col gap-3">
      <p class="text-body text-label-2">
        {copied
          ? t('message.shareSuccess', { url: '' }).replace(/:\s*$/, '')
          : t('message.shareCopyToClipboard')}
      </p>
      <div class="flex gap-2">
        <Input
          value={url}
          readonly
          onfocus={(e) => e.currentTarget.select()}
          class="font-mono text-callout"
        />
        <Button variant="secondary" onclick={copy}>
          {#if copied}<Check />{:else}<Copy />{/if}
        </Button>
      </div>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      <Field label={t('resources.share.fields.description')} for="share-desc">
        <Input id="share-desc" bind:value={description} />
      </Field>
      {#if config.enableDownloads}
        <Field label={t('resources.share.fields.downloadable')} for="share-dl" inline>
          <Switch id="share-dl" bind:checked={downloadable} />
        </Field>
      {/if}
      <TranscodingOptions
        bind:original
        bind:format
        bind:maxBitRate
        label={t('message.shareOriginalFormat')}
      />
    </div>
  {/if}

  {#snippet footer()}
    {#if url}
      <Button onclick={() => (ui.share = null)}>{t('ra.action.close')}</Button>
    {:else}
      <Button variant="ghost" onclick={() => (ui.share = null)}>{t('ra.action.cancel')}</Button>
      <Button disabled={busy} onclick={share}>{t('ra.action.share')}</Button>
    {/if}
  {/snippet}
</Dialog>
