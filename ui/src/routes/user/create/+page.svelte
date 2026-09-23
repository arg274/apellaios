<script lang="ts">
  import { getAll } from '$lib/api/rest'
  import { validationErrors } from '$lib/api/http'
  import { createUser, type UserInput } from '$lib/api/native'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import LibraryPicker from '$lib/components/forms/LibraryPicker.svelte'
  import { translateErrors, validateUser, type UserErrors } from '$lib/components/forms/userForm'
  import Field from '$lib/components/ui/Field.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  const libraries = new Loader(
    () => 'libraries',
    () => getAll('library', { sort: 'name', order: 'ASC' }),
  )

  let user = $state<UserInput>({ userName: '', name: '', email: '', password: '', isAdmin: false })
  // Until the admin touches the list, new users get the libraries flagged as defaults
  let pickedLibraries = $state<number[] | null>(null)
  const libraryIds = $derived(
    pickedLibraries ?? (libraries.value ?? []).filter((l) => l.defaultNewUsers).map((l) => l.id),
  )
  let errors = $state<UserErrors>({})

  const clear = (key: keyof UserErrors) => (errors = { ...errors, [key]: undefined })

  async function save() {
    const input = { ...user, libraryIds }
    errors = validateUser(input, {
      requireUserName: true,
      requirePassword: true,
      requireCurrentPassword: false,
      checkLibraries: false,
    })
    if (Object.values(errors).some(Boolean)) return false
    try {
      await createUser(input)
    } catch (err) {
      const fields = validationErrors(err)
      if (!fields) throw err
      errors = translateErrors(fields)
      return false
    }
  }
</script>

<FormPage
  title={t('ra.page.create', { name: t('resources.user.name', { smart_count: 1 }) })}
  backHref={href('/user')}
  dirty={!!user.userName?.trim()}
  onsave={save}
>
  <FormSection>
    <Field label={t('resources.user.fields.userName')} for="user-userName" error={errors.userName}>
      <Input
        id="user-userName"
        bind:value={user.userName}
        invalid={!!errors.userName}
        autofocus
        autocomplete="off"
        spellcheck={false}
        oninput={() => clear('userName')}
      />
    </Field>
    <Field label={t('resources.user.fields.name')} for="user-name" error={errors.name}>
      <Input
        id="user-name"
        bind:value={user.name}
        invalid={!!errors.name}
        autocomplete="off"
        oninput={() => clear('name')}
      />
    </Field>
    <Field label={t('resources.user.fields.email')} for="user-email" error={errors.email}>
      <Input
        id="user-email"
        type="email"
        bind:value={user.email}
        invalid={!!errors.email}
        autocomplete="off"
        spellcheck={false}
        oninput={() => clear('email')}
      />
    </Field>
    <Field label={t('resources.user.fields.password')} for="user-password" error={errors.password}>
      <Input
        id="user-password"
        type="password"
        bind:value={user.password}
        invalid={!!errors.password}
        autocomplete="new-password"
        oninput={() => clear('password')}
      />
    </Field>
  </FormSection>

  <FormSection>
    <Field label={t('resources.user.fields.isAdmin')} for="user-isAdmin" inline>
      <Switch
        id="user-isAdmin"
        bind:checked={() => user.isAdmin ?? false, (v) => (user.isAdmin = v)}
      />
    </Field>
    {#if user.isAdmin}
      <p class="text-callout text-label-2">{t('resources.user.message.adminAutoLibraries')}</p>
    {:else}
      <Field
        label={t('resources.user.fields.libraries')}
        hint={t('resources.user.helperTexts.libraries')}
        error={errors.libraryIds}
      >
        <LibraryPicker
          libraries={libraries.value ?? []}
          value={libraryIds}
          onchange={(ids) => (pickedLibraries = ids)}
        />
      </Field>
    {/if}
  </FormSection>
</FormPage>
