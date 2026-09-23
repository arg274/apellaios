<script lang="ts">
  import { ChevronLeft } from '@lucide/svelte'
  import { page } from '$app/state'
  import config from '$lib/config'
  import { getOne, remove, update } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import TranscodingFields, {
    validateTranscoding,
    type TranscodingDraft,
    type TranscodingErrors,
  } from '$lib/components/forms/TranscodingFields.svelte'
  import TranscodingNote from '$lib/components/forms/TranscodingNote.svelte'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const id = $derived(page.params.id!)
  const transcoding = new Loader(
    () => id,
    (id, signal) => getOne('transcoding', id, { signal }),
  )
  const tc = $derived(transcoding.value?.id === id ? transcoding.value : undefined)

  let edits = $state<Record<string, Partial<TranscodingDraft>>>({})
  const draft = $derived<TranscodingDraft>({
    name: tc?.name ?? '',
    targetFormat: tc?.targetFormat ?? '',
    defaultBitRate: tc?.defaultBitRate ?? 0,
    command: tc?.command ?? '',
    ...edits[id],
  })
  const dirty = $derived(Object.keys(edits[id] ?? {}).length > 0)
  let errors = $state<TranscodingErrors>({})

  const title = $derived(
    tc
      ? `${t('resources.transcoding.name', { smart_count: 1 })} "${tc.name}"`
      : t('resources.transcoding.name', { smart_count: 1 }),
  )

  async function save() {
    errors = validateTranscoding(draft)
    if (Object.values(errors).some(Boolean)) return false
    await update('transcoding', id, { ...tc, ...draft })
    delete edits[id]
  }
</script>

<!-- Editing runs arbitrary commands on the server, so it's off unless the admin opted in -->
{#if config.enableTranscodingConfig}
  <TranscodingNote />
  <FormPage
    {title}
    backHref={href('/transcoding')}
    loading={!tc}
    {dirty}
    onsave={save}
    ondelete={() => remove('transcoding', id)}
  >
    <TranscodingFields
      value={draft}
      bind:errors
      onchange={(key, v) => (edits[id] = { ...edits[id], [key]: v })}
    />
  </FormPage>
{:else}
  <PageTitle {title} />
  <a
    href={href('/transcoding')}
    class="mb-2 inline-flex items-center gap-0.5 text-body text-accent hover:opacity-80"
  >
    <ChevronLeft class="size-4" />{t('ra.action.back')}
  </a>
  <h1 class="mb-6 text-[28px] leading-tight font-bold text-label">{title}</h1>
  <TranscodingNote />
  {#if tc}
    <div class="max-w-2xl"><TranscodingFields value={draft} readonly onchange={() => {}} /></div>
  {:else}
    <div class="flex justify-center py-20"><Spinner class="size-7" /></div>
  {/if}
{/if}
