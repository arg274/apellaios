<script lang="ts" module>
  import { t } from '$lib/i18n/index.svelte'

  export interface TranscodingDraft {
    name: string
    targetFormat: string
    defaultBitRate: number
    command: string
  }

  export type TranscodingErrors = Partial<Record<keyof TranscodingDraft, string>>

  export function validateTranscoding(d: TranscodingDraft): TranscodingErrors {
    const errors: TranscodingErrors = {}
    for (const key of ['name', 'targetFormat', 'command'] as const) {
      if (!d[key].trim()) errors[key] = t('ra.validation.required')
    }
    return errors
  }
</script>

<script lang="ts">
  import { BITRATES } from '$lib/bitrates'
  import Field from '$lib/components/ui/Field.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'

  let {
    value,
    errors = $bindable({}),
    readonly = false,
    autofocus = false,
    onchange,
  }: {
    value: TranscodingDraft
    errors?: TranscodingErrors
    readonly?: boolean
    autofocus?: boolean
    onchange: <K extends keyof TranscodingDraft>(key: K, value: TranscodingDraft[K]) => void
  } = $props()

  const edit = <K extends keyof TranscodingDraft>(key: K, v: TranscodingDraft[K]) => {
    errors = { ...errors, [key]: undefined }
    onchange(key, v)
  }

  // 0 is a stored value meaning "no default bit rate"
  const bitRates = $derived([
    { value: '0', label: t('resources.transcoding.choices.noDefaultBitRate') },
    ...BITRATES.map((b) => ({ value: String(b), label: String(b) })),
  ])
</script>

<FormSection>
  <Field label={t('resources.transcoding.fields.name')} for="tc-name" error={errors.name}>
    <Input
      id="tc-name"
      value={value.name}
      {readonly}
      {autofocus}
      invalid={!!errors.name}
      oninput={(e) => edit('name', e.currentTarget.value)}
    />
  </Field>
  <Field
    label={t('resources.transcoding.fields.targetFormat')}
    for="tc-format"
    error={errors.targetFormat}
  >
    <Input
      id="tc-format"
      value={value.targetFormat}
      {readonly}
      spellcheck={false}
      invalid={!!errors.targetFormat}
      oninput={(e) => edit('targetFormat', e.currentTarget.value)}
    />
  </Field>
  <Field label={t('resources.transcoding.fields.defaultBitRate')} for="tc-bitrate">
    <Select
      id="tc-bitrate"
      class="w-full"
      disabled={readonly}
      value={String(value.defaultBitRate ?? 0)}
      options={bitRates}
      onValueChange={(v) => edit('defaultBitRate', Number(v))}
    />
  </Field>
  <Field
    label={t('resources.transcoding.fields.command')}
    for="tc-command"
    error={errors.command}
    hint={readonly ? undefined : '%s: file path · %b: bit rate (kbps)'}
  >
    <Input
      id="tc-command"
      value={value.command}
      {readonly}
      spellcheck={false}
      class="font-mono text-callout"
      invalid={!!errors.command}
      oninput={(e) => edit('command', e.currentTarget.value)}
    />
  </Field>
</FormSection>
