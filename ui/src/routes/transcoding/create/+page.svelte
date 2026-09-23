<script lang="ts">
  import config from '$lib/config'
  import { create } from '$lib/api/rest'
  import { t } from '$lib/i18n/index.svelte'
  import { href, navigate } from '$lib/nav.svelte'
  import TranscodingFields, {
    validateTranscoding,
    type TranscodingDraft,
    type TranscodingErrors,
  } from '$lib/components/forms/TranscodingFields.svelte'
  import TranscodingNote from '$lib/components/forms/TranscodingNote.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'

  let draft = $state<TranscodingDraft>({
    name: '',
    targetFormat: '',
    defaultBitRate: 192,
    command: '',
  })
  let errors = $state<TranscodingErrors>({})

  // Only reachable when the server allows editing transcodings
  $effect(() => {
    if (!config.enableTranscodingConfig) navigate('/transcoding', { replace: true })
  })

  async function save() {
    errors = validateTranscoding(draft)
    if (Object.values(errors).some(Boolean)) return false
    await create('transcoding', draft)
  }
</script>

<TranscodingNote />
<FormPage
  title={t('ra.page.create', { name: t('resources.transcoding.name', { smart_count: 1 }) })}
  backHref={href('/transcoding')}
  dirty={!!draft.name.trim()}
  onsave={save}
>
  <TranscodingFields value={draft} bind:errors autofocus onchange={(key, v) => (draft[key] = v)} />
</FormPage>
