<script lang="ts">
  import { create } from '$lib/api/rest'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import RadioFields, {
    trimRadio,
    validateRadio,
    type RadioDraft,
    type RadioErrors,
  } from '$lib/components/forms/RadioFields.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'

  let draft = $state<RadioDraft>({ name: '', streamUrl: '', homePageUrl: '' })
  let errors = $state<RadioErrors>({})

  async function save() {
    errors = validateRadio(draft)
    if (Object.keys(errors).length) return false
    await create('radio', trimRadio(draft))
  }
</script>

<FormPage
  title={t('ra.page.create', { name: t('resources.radio.name', { smart_count: 1 }) })}
  backHref={href('/radio')}
  dirty={!!draft.name.trim() || !!draft.streamUrl.trim()}
  onsave={save}
>
  <RadioFields value={draft} bind:errors autofocus onchange={(key, v) => (draft[key] = v)} />
</FormPage>
