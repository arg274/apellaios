<script lang="ts">
  import { create } from '$lib/api/rest'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'
  import Textarea from '$lib/components/ui/Textarea.svelte'

  let name = $state('')
  let comment = $state('')
  let isPublic = $state(true)
  let error = $state('')

  async function save() {
    if (!name.trim()) {
      error = t('ra.validation.required')
      return false
    }
    await create('playlist', { name: name.trim(), comment, public: isPublic })
  }
</script>

<FormPage
  title={t('ra.page.create', { name: t('resources.playlist.name', { smart_count: 1 }) })}
  backHref={href('/playlist')}
  dirty={!!name.trim()}
  onsave={save}
>
  <FormSection>
    <Field label={t('resources.playlist.fields.name')} for="pls-name" {error}>
      <Input
        id="pls-name"
        bind:value={name}
        invalid={!!error}
        autofocus
        oninput={() => (error = '')}
      />
    </Field>
    <Field label={t('resources.playlist.fields.comment')} for="pls-comment">
      <Textarea id="pls-comment" bind:value={comment} rows={3} />
    </Field>
    <Field label={t('resources.playlist.fields.public')} for="pls-public" inline>
      <Switch id="pls-public" bind:checked={isPublic} />
    </Field>
  </FormSection>
</FormPage>
