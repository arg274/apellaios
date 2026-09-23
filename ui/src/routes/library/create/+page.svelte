<script lang="ts">
  import { create } from '$lib/api/rest'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import LibraryFields, {
    libraryServerErrors,
    validateLibrary,
    type LibraryDraft,
    type LibraryErrors,
  } from '$lib/components/forms/LibraryFields.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'

  let draft = $state<LibraryDraft>({ name: '', path: '', defaultNewUsers: false })
  let errors = $state<LibraryErrors>({})

  async function save() {
    errors = validateLibrary(draft)
    if (Object.values(errors).some(Boolean)) return false
    try {
      await create('library', { ...draft, name: draft.name.trim(), path: draft.path.trim() })
    } catch (err) {
      const fields = libraryServerErrors(err)
      if (!fields) throw err
      errors = fields
      return false
    }
  }
</script>

<FormPage
  title={t('ra.page.create', { name: t('resources.library.name', { smart_count: 1 }) })}
  backHref={href('/library')}
  dirty={!!draft.name.trim() || !!draft.path.trim()}
  onsave={save}
>
  <LibraryFields value={draft} bind:errors autofocus onchange={(key, v) => (draft[key] = v)} />
</FormPage>
