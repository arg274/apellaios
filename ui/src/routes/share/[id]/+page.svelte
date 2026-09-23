<script lang="ts">
  import { Copy, ExternalLink } from '@lucide/svelte'
  import { page } from '$app/state'
  import config from '$lib/config'
  import { getOne, remove, update } from '$lib/api/rest'
  import type { Share } from '$lib/api/types'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import { copyText } from '$lib/utils/misc'
  import { shareFormat, toLocalInput } from '$lib/utils/share'
  import { sharePlayerUrl } from '$lib/utils/urls'
  import Field from '$lib/components/ui/Field.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  const id = $derived(page.params.id!)
  const share = new Loader(
    () => id,
    (id, signal) => getOne('share', id, { signal }),
  )
  const s = $derived(share.value?.id === id ? share.value : undefined)
  const url = $derived(sharePlayerUrl(id))

  type Editable = Pick<Share, 'description' | 'downloadable'> & { expiresAt: string }
  let edits = $state<Record<string, Partial<Editable>>>({})
  const form = $derived<Editable>({
    description: s?.description ?? '',
    downloadable: s?.downloadable ?? false,
    expiresAt: toLocalInput(s?.expiresAt),
    ...edits[id],
  })
  const set = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    (edits[id] = { ...edits[id], [key]: value })
  const dirty = $derived(Object.keys(edits[id] ?? {}).length > 0)

  const visited = $derived(
    s?.lastVisitedAt && !s.lastVisitedAt.startsWith('0001') ? formatDateTime(s.lastVisitedAt) : '—',
  )

  async function save() {
    await update('share', id, {
      ...s,
      description: form.description,
      downloadable: form.downloadable,
      // datetime-local is wall-clock time; send it back as an absolute instant
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    })
    delete edits[id]
  }

  async function copyLink() {
    if (await copyText(url)) toast.success(t('message.shareSuccess', { url }))
    else toast.warning(t('message.shareFailure', { url }))
  }
</script>

<FormPage
  title={s ? s.description || s.contents || s.id : t('resources.share.name', { smart_count: 1 })}
  backHref={href('/share')}
  loading={!s}
  {dirty}
  onsave={save}
  ondelete={() => remove('share', id)}
>
  <FormSection>
    <Field label={t('resources.share.fields.url')}>
      <div class="flex items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          class="flex min-w-0 flex-1 items-center gap-1 text-body text-accent hover:underline"
        >
          <span class="truncate">{url}</span><ExternalLink class="size-3 shrink-0" />
        </a>
        <IconButton size="sm" label={t('ui.copyLink')} onclick={copyLink}><Copy /></IconButton>
      </div>
    </Field>
    <Field label={t('resources.share.fields.description')} for="share-description">
      <Input
        id="share-description"
        value={form.description}
        oninput={(e) => set('description', e.currentTarget.value)}
      />
    </Field>
    <Field label={t('resources.share.fields.expiresAt')} for="share-expires">
      <Input
        id="share-expires"
        type="datetime-local"
        value={form.expiresAt}
        oninput={(e) => set('expiresAt', e.currentTarget.value)}
        class="w-auto"
      />
    </Field>
    {#if config.enableDownloads}
      <Field label={t('resources.share.fields.downloadable')} for="share-downloadable" inline>
        <Switch
          id="share-downloadable"
          checked={form.downloadable}
          onCheckedChange={(v) => set('downloadable', v)}
        />
      </Field>
    {/if}
  </FormSection>

  {#snippet aside()}
    {#if s}
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-callout">
        <dt class="text-label-2">{t('resources.share.fields.contents')}</dt>
        <dd class="text-label">{s.contents}</dd>
        <dt class="text-label-2">{t('resources.share.fields.format')}</dt>
        <dd class="text-label">{shareFormat(s)}</dd>
        <dt class="text-label-2">{t('resources.share.fields.username')}</dt>
        <dd class="text-label">{s.username}</dd>
        <dt class="text-label-2">{t('resources.share.fields.visitCount')}</dt>
        <dd class="text-label">{s.visitCount ?? 0}</dd>
        <dt class="text-label-2">{t('resources.share.fields.lastVisitedAt')}</dt>
        <dd class="text-label">{visited}</dd>
        <dt class="text-label-2">{t('resources.share.fields.createdAt')}</dt>
        <dd class="text-label">{formatDateTime(s.createdAt)}</dd>
      </dl>
    {/if}
  {/snippet}
</FormPage>
