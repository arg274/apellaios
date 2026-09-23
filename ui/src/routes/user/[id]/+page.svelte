<script lang="ts">
  import { page } from '$app/state'
  import { validationErrors } from '$lib/api/http'
  import { getUser, updateUser, type UserInput } from '$lib/api/native'
  import { getAll, remove } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import LibraryPicker from '$lib/components/forms/LibraryPicker.svelte'
  import { translateErrors, validateUser, type UserErrors } from '$lib/components/forms/userForm'
  import Field from '$lib/components/ui/Field.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'
  import Textarea from '$lib/components/ui/Textarea.svelte'

  const id = $derived(page.params.id!)
  const user = new Loader(
    () => id,
    (id) => getUser(id),
  )
  const libraries = new Loader(
    () => (auth.isAdmin ? 'libraries' : null),
    () => getAll('library', { sort: 'name', order: 'ASC' }),
  )
  const u = $derived(user.value?.id === id ? user.value : undefined)

  const isMyself = $derived(id === auth.user?.id)
  const isAdmin = $derived(auth.isAdmin)

  // Edits are kept per user id, over the loaded record
  let edits = $state<Record<string, UserInput & { changePassword?: boolean }>>({})
  const form = $derived({ ...u, ...edits[id] })
  const set = <K extends keyof (UserInput & { changePassword?: boolean })>(
    key: K,
    value: (UserInput & { changePassword?: boolean })[K],
  ) => {
    edits[id] = { ...edits[id], [key]: value }
    errors = { ...errors, [key]: undefined }
  }
  const dirty = $derived(Object.keys(edits[id] ?? {}).length > 0)
  // Admins reset other people's passwords without knowing them
  const needsCurrentPassword = $derived(!!form.changePassword && (isMyself || !isAdmin))

  let errors = $state<UserErrors>({})

  // Regular users only reach their own profile, so "back" leads home
  const backHref = $derived(isAdmin ? href('/user') : href(settings.defaultView))
  const when = (v?: string) => (v && !v.startsWith('0001') ? formatDateTime(v) : '—')

  async function save() {
    const { changePassword, ...changes } = edits[id] ?? {}
    const input: UserInput = { ...u, ...changes }
    if (!changePassword) {
      delete input.password
      delete input.currentPassword
    }
    errors = validateUser(input, {
      requireUserName: isAdmin,
      requirePassword: !!changePassword,
      requireCurrentPassword: !!changePassword && needsCurrentPassword,
      checkLibraries: isAdmin,
    })
    if (Object.values(errors).some(Boolean)) return false
    try {
      await updateUser(id, input)
    } catch (err) {
      const fields = validationErrors(err)
      if (!fields) throw err
      errors = translateErrors(fields)
      return false
    }
    delete edits[id]
  }
</script>

<FormPage
  title={u
    ? `${t('resources.user.name', { smart_count: 1 })} "${u.name}"`
    : t('resources.user.name', { smart_count: 1 })}
  {backHref}
  loading={!u}
  {dirty}
  onsave={save}
  ondelete={isAdmin && !isMyself ? () => remove('user', id) : undefined}
  deleteTitle={t('message.delete_user_title', { name: u?.name ?? '' })}
  deleteMessage={t('message.delete_user_content')}
>
  <FormSection>
    {#if isAdmin}
      <Field
        label={t('resources.user.fields.userName')}
        for="user-userName"
        error={errors.userName}
      >
        <Input
          id="user-userName"
          value={form.userName ?? ''}
          invalid={!!errors.userName}
          autocomplete="off"
          spellcheck={false}
          oninput={(e) => set('userName', e.currentTarget.value)}
        />
      </Field>
    {/if}
    <Field
      label={t('resources.user.fields.name')}
      for="user-name"
      error={errors.name}
      hint={isMyself ? t('resources.user.helperTexts.name') : undefined}
    >
      <Input
        id="user-name"
        value={form.name ?? ''}
        invalid={!!errors.name}
        autocomplete="off"
        oninput={(e) => set('name', e.currentTarget.value)}
      />
    </Field>
    <Field label={t('resources.user.fields.email')} for="user-email" error={errors.email}>
      <Input
        id="user-email"
        type="email"
        value={form.email ?? ''}
        invalid={!!errors.email}
        autocomplete="off"
        spellcheck={false}
        oninput={(e) => set('email', e.currentTarget.value)}
      />
    </Field>
  </FormSection>

  <FormSection>
    <Field label={t('resources.user.fields.changePassword')} for="user-changePassword" inline>
      <Switch
        id="user-changePassword"
        checked={!!form.changePassword}
        onCheckedChange={(v) => set('changePassword', v)}
      />
    </Field>
    {#if form.changePassword}
      {#if needsCurrentPassword}
        <Field
          label={t('resources.user.fields.currentPassword')}
          for="user-currentPassword"
          error={errors.currentPassword}
        >
          <Input
            id="user-currentPassword"
            type="password"
            value={form.currentPassword ?? ''}
            invalid={!!errors.currentPassword}
            autocomplete="current-password"
            oninput={(e) => set('currentPassword', e.currentTarget.value)}
          />
        </Field>
      {/if}
      <Field
        label={t('resources.user.fields.newPassword')}
        for="user-password"
        error={errors.password}
      >
        <Input
          id="user-password"
          type="password"
          value={form.password ?? ''}
          invalid={!!errors.password}
          autocomplete="new-password"
          oninput={(e) => set('password', e.currentTarget.value)}
        />
      </Field>
    {/if}
  </FormSection>

  {#if isAdmin}
    <FormSection>
      <Field label={t('resources.user.fields.isAdmin')} for="user-isAdmin" inline>
        <!-- Demoting yourself would lock you out of this very screen -->
        <Switch
          id="user-isAdmin"
          checked={!!form.isAdmin}
          disabled={isMyself}
          onCheckedChange={(v) => set('isAdmin', v)}
        />
      </Field>
      {#if form.isAdmin}
        <p class="text-callout text-label-2">{t('resources.user.message.adminAutoLibraries')}</p>
      {:else}
        <Field
          label={t('resources.user.fields.libraries')}
          hint={t('resources.user.helperTexts.libraries')}
          error={errors.libraryIds}
        >
          <LibraryPicker
            libraries={libraries.value ?? []}
            value={form.libraryIds ?? []}
            onchange={(ids) => set('libraryIds', ids)}
          />
        </Field>
      {/if}
    </FormSection>
  {/if}

  <FormSection>
    <Field
      label={t('resources.user.fields.scrobbleFilter')}
      for="user-scrobbleFilter"
      error={errors.scrobbleFilter}
      hint={t('resources.user.helperTexts.scrobbleFilter')}
    >
      <Textarea
        id="user-scrobbleFilter"
        value={form.scrobbleFilter ?? ''}
        rows={3}
        spellcheck={false}
        class="font-mono text-callout"
        oninput={(e) => set('scrobbleFilter', e.currentTarget.value)}
      />
    </Field>
  </FormSection>

  {#snippet aside()}
    {#if u}
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-callout">
        <dt class="text-label-2">{t('resources.user.fields.lastLoginAt')}</dt>
        <dd class="text-label">{when(u.lastLoginAt)}</dd>
        <dt class="text-label-2">{t('resources.user.fields.lastAccessAt')}</dt>
        <dd class="text-label">{when(u.lastAccessAt)}</dd>
        <dt class="text-label-2">{t('resources.user.fields.updatedAt')}</dt>
        <dd class="text-label">{when(u.updatedAt)}</dd>
        <dt class="text-label-2">{t('resources.user.fields.createdAt')}</dt>
        <dd class="text-label">{when(u.createdAt)}</dd>
      </dl>
    {/if}
  {/snippet}
</FormPage>
