<script lang="ts" module>
  import { HttpError, validationErrors } from '$lib/api/http'
  import { t } from '$lib/i18n/index.svelte'

  export interface LibraryDraft {
    name: string
    path: string
    defaultNewUsers: boolean
  }

  export type LibraryErrors = Partial<Record<'name' | 'path', string>>

  export function validateLibrary(d: LibraryDraft): LibraryErrors {
    const errors: LibraryErrors = {}
    if (!d.name.trim()) errors.name = t('resources.library.validation.nameRequired')
    if (!d.path.trim()) errors.path = t('resources.library.validation.pathRequired')
    return errors
  }

  /**
   * Maps a failed save onto the fields: validation errors come keyed by field, while duplicate
   * names or paths only surface as the database's constraint message.
   */
  export function libraryServerErrors(err: unknown): LibraryErrors | null {
    const fields = validationErrors(err)
    if (fields)
      return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, t(v, { _: v })]))
    const message =
      err instanceof HttpError ? String((err.body as { error?: string } | null)?.error ?? '') : ''
    if (message.includes('library.name')) return { name: t('ra.validation.unique') }
    if (message.includes('library.path')) return { path: t('ra.validation.unique') }
    return null
  }
</script>

<script lang="ts">
  import Field from '$lib/components/ui/Field.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  let {
    value,
    errors = $bindable({}),
    pathLocked = false,
    autofocus = false,
    onchange,
  }: {
    value: LibraryDraft
    errors?: LibraryErrors
    /** The main library's path comes from the MusicFolder setting */
    pathLocked?: boolean
    autofocus?: boolean
    onchange: <K extends keyof LibraryDraft>(key: K, value: LibraryDraft[K]) => void
  } = $props()

  const edit = <K extends keyof LibraryDraft>(key: K, v: LibraryDraft[K]) => {
    errors = { ...errors, [key]: undefined }
    onchange(key, v)
  }
</script>

<FormSection title={t('resources.library.sections.basic')}>
  <Field label={t('resources.library.fields.name')} for="lib-name" error={errors.name}>
    <Input
      id="lib-name"
      value={value.name}
      {autofocus}
      invalid={!!errors.name}
      oninput={(e) => edit('name', e.currentTarget.value)}
    />
  </Field>
  <Field label={t('resources.library.fields.path')} for="lib-path" error={errors.path}>
    <Input
      id="lib-path"
      value={value.path}
      readonly={pathLocked}
      spellcheck={false}
      class="font-mono text-callout"
      invalid={!!errors.path}
      oninput={(e) => edit('path', e.currentTarget.value)}
    />
  </Field>
  <Field label={t('resources.library.fields.defaultNewUsers')} for="lib-default" inline>
    <Switch
      id="lib-default"
      checked={value.defaultNewUsers}
      onCheckedChange={(v) => edit('defaultNewUsers', v)}
    />
  </Field>
</FormSection>
