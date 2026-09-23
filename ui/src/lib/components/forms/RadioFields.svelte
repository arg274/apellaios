<script lang="ts" module>
  import { t } from '$lib/i18n/index.svelte'
  import { urlValidate } from '$lib/utils/misc'

  export interface RadioDraft {
    name: string
    streamUrl: string
    homePageUrl: string
  }

  export type RadioErrors = Partial<Record<keyof RadioDraft, string>>

  /** Name and stream are required; both URLs must parse */
  export function validateRadio(r: RadioDraft): RadioErrors {
    const errors: RadioErrors = {}
    if (!r.name.trim()) errors.name = t('ra.validation.required')
    if (!r.streamUrl.trim()) errors.streamUrl = t('ra.validation.required')
    else if (urlValidate(r.streamUrl.trim())) errors.streamUrl = t('ra.validation.url')
    if (urlValidate(r.homePageUrl.trim())) errors.homePageUrl = t('ra.validation.url')
    return errors
  }

  export const trimRadio = (r: RadioDraft): RadioDraft => ({
    name: r.name.trim(),
    streamUrl: r.streamUrl.trim(),
    homePageUrl: r.homePageUrl.trim(),
  })
</script>

<script lang="ts">
  import Field from '$lib/components/ui/Field.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'

  let {
    value,
    errors = $bindable({}),
    autofocus = false,
    onchange,
  }: {
    value: RadioDraft
    errors?: RadioErrors
    autofocus?: boolean
    onchange: (key: keyof RadioDraft, value: string) => void
  } = $props()

  const edit = (key: keyof RadioDraft, v: string) => {
    errors = { ...errors, [key]: undefined }
    onchange(key, v)
  }
</script>

{#snippet urlField(key: 'streamUrl' | 'homePageUrl', v: string)}
  <Field label={t(`resources.radio.fields.${key}`)} for="radio-{key}" error={errors[key]}>
    <Input
      id="radio-{key}"
      type="url"
      value={v}
      invalid={!!errors[key]}
      autocomplete="off"
      spellcheck={false}
      oninput={(e) => edit(key, e.currentTarget.value)}
    />
  </Field>
{/snippet}

<FormSection>
  <Field label={t('resources.radio.fields.name')} for="radio-name" error={errors.name}>
    <Input
      id="radio-name"
      value={value.name}
      invalid={!!errors.name}
      {autofocus}
      autocomplete="off"
      oninput={(e) => edit('name', e.currentTarget.value)}
    />
  </Field>
  {@render urlField('streamUrl', value.streamUrl)}
  {@render urlField('homePageUrl', value.homePageUrl)}
</FormSection>
