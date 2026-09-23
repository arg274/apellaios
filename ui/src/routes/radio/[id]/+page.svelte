<script lang="ts">
  import { page } from '$app/state'
  import { getOne, remove, update } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import RadioFields, {
    trimRadio,
    validateRadio,
    type RadioDraft,
    type RadioErrors,
  } from '$lib/components/forms/RadioFields.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import ImageUploadOverlay from '$lib/components/media/ImageUploadOverlay.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'

  const id = $derived(page.params.id!)
  const radio = new Loader(
    () => id,
    (id, signal) => getOne('radio', id, { signal }),
  )
  const r = $derived(radio.value?.id === id ? radio.value : undefined)

  // Edits are kept per radio id so switching records never shows stale input
  let edits = $state<Record<string, Partial<RadioDraft>>>({})
  const draft = $derived<RadioDraft>({
    name: r?.name ?? '',
    streamUrl: r?.streamUrl ?? '',
    homePageUrl: r?.homePageUrl ?? '',
    ...edits[id],
  })
  const dirty = $derived(Object.keys(edits[id] ?? {}).length > 0)
  let errors = $state<RadioErrors>({})

  async function save() {
    errors = validateRadio(draft)
    if (Object.keys(errors).length) return false
    await update('radio', id, { ...r, ...trimRadio(draft) })
    delete edits[id]
  }
</script>

<FormPage
  title={r
    ? `${t('resources.radio.name', { smart_count: 1 })} "${r.name}"`
    : t('resources.radio.name', { smart_count: 1 })}
  backHref={href('/radio')}
  loading={!r}
  {dirty}
  onsave={save}
  ondelete={() => remove('radio', id)}
>
  <RadioFields
    value={draft}
    bind:errors
    onchange={(key, v) => (edits[id] = { ...edits[id], [key]: v })}
  />

  {#snippet aside()}
    {#if r}
      <div class="group relative w-48 lg:w-full">
        <Artwork kind="radio" record={r.uploadedImage ? r : null} size={288} alt={r.name} />
        <ImageUploadOverlay
          entity="radio"
          id={r.id}
          hasUploadedImage={!!r.uploadedImage}
          onchange={() => radio.reload()}
        />
      </div>
      <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-callout">
        <dt class="text-label-2">{t('resources.radio.fields.updatedAt')}</dt>
        <dd class="text-label">{formatDateTime(r.updatedAt)}</dd>
        <dt class="text-label-2">{t('resources.radio.fields.createdAt')}</dt>
        <dd class="text-label">{formatDateTime(r.createdAt)}</dd>
      </dl>
    {/if}
  {/snippet}
</FormPage>
