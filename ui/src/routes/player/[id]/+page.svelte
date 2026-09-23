<script lang="ts">
  import { page } from '$app/state'
  import { BITRATES } from '$lib/bitrates'
  import config from '$lib/config'
  import { getAll, getOne, remove, update } from '$lib/api/rest'
  import type { Player } from '$lib/api/types'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import Field from '$lib/components/ui/Field.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  const id = $derived(page.params.id!)
  const player = new Loader(
    () => id,
    (id, signal) => getOne('player', id, { signal }),
  )
  const transcodings = new Loader(
    () => 'transcodings',
    () => getAll('transcoding', { sort: 'name', order: 'ASC' }),
  )
  const p = $derived(player.value?.id === id ? player.value : undefined)

  let edits = $state<Record<string, Partial<Player>>>({})
  const form = $derived<Partial<Player>>({ ...p, ...edits[id] })
  const set = <K extends keyof Player>(key: K, value: Player[K]) =>
    (edits[id] = { ...edits[id], [key]: value })
  const dirty = $derived(Object.keys(edits[id] ?? {}).length > 0)
  let error = $state('')

  // '' stands for "none" in the selects; the server stores an empty id and a zero rate
  const none = { value: '', label: '—' }

  async function save() {
    if (!form.name?.trim()) {
      error = t('ra.validation.required')
      return false
    }
    await update('player', id, { ...p, ...edits[id], name: form.name.trim() })
    delete edits[id]
  }
</script>

<FormPage
  title={p
    ? `${t('resources.player.name', { smart_count: 1 })} "${p.name}"`
    : t('resources.player.name', { smart_count: 1 })}
  backHref={href('/player')}
  loading={!p}
  {dirty}
  onsave={save}
  ondelete={() => remove('player', id)}
>
  <FormSection>
    <Field label={t('resources.player.fields.name')} for="player-name" {error}>
      <Input
        id="player-name"
        value={form.name ?? ''}
        invalid={!!error}
        oninput={(e) => {
          error = ''
          set('name', e.currentTarget.value)
        }}
      />
    </Field>
    <Field label={t('resources.player.fields.transcodingId')} for="player-transcoding">
      <Select
        id="player-transcoding"
        class="w-full"
        value={form.transcodingId ?? ''}
        options={[
          none,
          ...(transcodings.value ?? []).map((tc) => ({ value: tc.id, label: tc.name })),
        ]}
        onValueChange={(v) => set('transcodingId', v)}
      />
    </Field>
    <Field label={t('resources.player.fields.maxBitRate')} for="player-bitrate">
      <Select
        id="player-bitrate"
        class="w-full"
        value={form.maxBitRate ? String(form.maxBitRate) : ''}
        options={[none, ...BITRATES.map((b) => ({ value: String(b), label: String(b) }))]}
        onValueChange={(v) => set('maxBitRate', Number(v) || 0)}
      />
    </Field>
  </FormSection>

  <FormSection>
    <Field label={t('resources.player.fields.reportRealPath')} for="player-realpath" inline>
      <Switch
        id="player-realpath"
        checked={!!form.reportRealPath}
        onCheckedChange={(v) => set('reportRealPath', v)}
      />
    </Field>
    {#if config.lastFMEnabled || config.listenBrainzEnabled}
      <Field label={t('resources.player.fields.scrobbleEnabled')} for="player-scrobble" inline>
        <Switch
          id="player-scrobble"
          checked={!!form.scrobbleEnabled}
          onCheckedChange={(v) => set('scrobbleEnabled', v)}
        />
      </Field>
    {/if}
  </FormSection>

  {#snippet aside()}
    {#if p}
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-callout">
        <dt class="text-label-2">{t('resources.player.fields.client')}</dt>
        <dd class="break-all text-label">{p.client}</dd>
        <dt class="text-label-2">{t('resources.player.fields.userName')}</dt>
        <dd class="text-label">{p.userName}</dd>
        <dt class="text-label-2">{t('resources.player.fields.lastSeen')}</dt>
        <dd class="text-label">{formatDateTime(p.lastSeen)}</dd>
        {#if p.ip}
          <dt class="text-label-2">IP</dt>
          <dd class="font-mono text-label">{p.ip}</dd>
        {/if}
      </dl>
      {#if p.userAgent}
        <p class="mt-3 font-mono text-[11px] leading-4 break-all text-label-3">{p.userAgent}</p>
      {/if}
    {/if}
  {/snippet}
</FormPage>
