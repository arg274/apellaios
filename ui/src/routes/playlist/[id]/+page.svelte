<script lang="ts">
  import { page } from '$app/state'
  import { getAll, getOne, remove, update } from '$lib/api/rest'
  import type { Playlist } from '$lib/api/types'
  import { Loader } from '$lib/data.svelte'
  import { isWritable } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'
  import Textarea from '$lib/components/ui/Textarea.svelte'

  const id = $derived(page.params.id!)
  const playlist = new Loader(
    () => id,
    (id, signal) => getOne('playlist', id, { signal }),
  )
  const users = new Loader(
    () => (auth.isAdmin ? 'users' : null),
    () => getAll('user', { sort: 'name', order: 'ASC' }),
  )

  // Form state starts from the loaded record; edits are kept per playlist id
  let edits = $state<Record<string, Partial<Playlist>>>({})
  const p = $derived(playlist.value?.id === id ? playlist.value : undefined)
  const form = $derived<Partial<Playlist>>({ ...p, ...edits[id] })
  const set = <K extends keyof Playlist>(key: K, value: Playlist[K]) => {
    edits[id] = { ...edits[id], [key]: value }
  }
  const dirty = $derived(Object.keys(edits[id] ?? {}).length > 0)
  const writable = $derived(!!p && isWritable(p.ownerId))

  let error = $state('')

  async function save() {
    if (!form.name?.trim()) {
      error = t('ra.validation.required')
      return false
    }
    await update('playlist', id, { ...p, ...edits[id], name: form.name.trim() })
    delete edits[id]
  }
</script>

<FormPage
  title={p
    ? `${t('resources.playlist.name', { smart_count: 1 })} "${p.name}"`
    : t('resources.playlist.name', { smart_count: 1 })}
  backHref={href(`/playlist/${id}/show`)}
  loading={!p}
  {dirty}
  onsave={save}
  ondelete={writable ? () => remove('playlist', id) : undefined}
>
  <FormSection>
    <Field label={t('resources.playlist.fields.name')} for="pls-name" {error}>
      <Input
        id="pls-name"
        value={form.name ?? ''}
        invalid={!!error}
        oninput={(e) => {
          error = ''
          set('name', e.currentTarget.value)
        }}
      />
    </Field>
    <Field label={t('resources.playlist.fields.comment')} for="pls-comment">
      <Textarea
        id="pls-comment"
        value={form.comment ?? ''}
        rows={3}
        oninput={(e) => set('comment', e.currentTarget.value)}
      />
    </Field>
    {#if auth.isAdmin}
      <Field label={t('resources.playlist.fields.ownerName')} for="pls-owner">
        <Select
          id="pls-owner"
          value={form.ownerId ?? ''}
          options={(users.value ?? []).map((u) => ({ value: u.id, label: u.userName }))}
          onValueChange={(v) => set('ownerId', v)}
        />
      </Field>
    {:else}
      <Field label={t('resources.playlist.fields.ownerName')}>
        <p class="text-body text-label-2">{p?.ownerName}</p>
      </Field>
    {/if}
    <Field label={t('resources.playlist.fields.public')} for="pls-public" inline>
      <Switch
        id="pls-public"
        checked={form.public ?? false}
        disabled={!writable}
        onCheckedChange={(v) => set('public', v)}
      />
    </Field>
  </FormSection>

  {#if p?.path}
    <FormSection title={t('resources.playlist.fields.sync')} description={p.path}>
      <Field label={t('resources.playlist.fields.sync')} for="pls-sync" inline>
        <Switch
          id="pls-sync"
          checked={form.sync ?? false}
          disabled={!writable}
          onCheckedChange={(v) => set('sync', v)}
        />
      </Field>
    </FormSection>
  {/if}
</FormPage>
