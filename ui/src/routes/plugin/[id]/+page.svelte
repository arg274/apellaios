<script lang="ts">
  import { CircleAlert, ExternalLink, TriangleAlert } from '@lucide/svelte'
  import { page } from '$app/state'
  import { getAll, getOne, update } from '$lib/api/rest'
  import { Loader } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { parseIds, parseManifest } from '$lib/plugins'
  import SchemaForm from '$lib/schemaForm/SchemaForm.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import { externalUrl } from '$lib/utils/urls'
  import PluginToggle from '$lib/components/plugins/PluginToggle.svelte'
  import CheckList from '$lib/components/ui/CheckList.svelte'
  import Field from '$lib/components/ui/Field.svelte'
  import FormPage from '$lib/components/ui/FormPage.svelte'
  import FormSection from '$lib/components/ui/FormSection.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  const id = $derived(page.params.id!)
  const plugin = new Loader(
    () => id,
    (id, signal) => getOne('plugin', id, { signal }),
  )
  const p = $derived(plugin.value?.id === id ? plugin.value : undefined)
  const manifest = $derived(parseManifest(p))
  const perms = $derived(manifest?.permissions ?? {})
  const configSchema = $derived(manifest?.config?.schema)
  // The manifest is third-party: only an http(s) website becomes a link
  const website = $derived(externalUrl(manifest?.website))

  const users = new Loader(
    () => (perms.users ? 'users' : null),
    () => getAll('user', { sort: 'userName', order: 'ASC' }),
  )
  const libraries = new Loader(
    () => (perms.library ? 'libraries' : null),
    () => getAll('library', { sort: 'name', order: 'ASC' }),
  )

  // Unsaved changes per plugin; only the parts touched are sent, the server applies each independently
  interface Edits {
    config?: { value: Record<string, unknown>; valid: boolean }
    users?: string[]
    allUsers?: boolean
    libraries?: number[]
    allLibraries?: boolean
    allowWriteAccess?: boolean
  }
  let edits = $state<Record<string, Edits>>({})
  const e = $derived(edits[id] ?? {})
  const edit = (changes: Edits) => (edits[id] = { ...edits[id], ...changes })

  const selectedUsers = $derived(e.users ?? parseIds<string>(p?.users))
  const allUsers = $derived(e.allUsers ?? p?.allUsers ?? false)
  const selectedLibraries = $derived(e.libraries ?? parseIds<number>(p?.libraries))
  const allLibraries = $derived(e.allLibraries ?? p?.allLibraries ?? false)
  const allowWriteAccess = $derived(e.allowWriteAccess ?? p?.allowWriteAccess ?? false)

  const dirty = $derived(Object.keys(e).length > 0 && e.config?.valid !== false)

  const initialConfig = $derived.by(() => {
    try {
      return p?.config ? (JSON.parse(p.config) as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  })

  async function save() {
    const data: Record<string, unknown> = {}
    if (e.config)
      data.config = Object.keys(e.config.value).length ? JSON.stringify(e.config.value) : ''
    if (e.users !== undefined || e.allUsers !== undefined) {
      data.users = JSON.stringify(selectedUsers)
      data.allUsers = allUsers
    }
    if (
      e.libraries !== undefined ||
      e.allLibraries !== undefined ||
      e.allowWriteAccess !== undefined
    ) {
      data.libraries = JSON.stringify(selectedLibraries)
      data.allLibraries = allLibraries
      data.allowWriteAccess = allowWriteAccess
    }
    await update('plugin', id, data)
    delete edits[id]
    plugin.reload()
  }

  const manifestJson = $derived(manifest ? JSON.stringify(manifest, null, 2) : (p?.manifest ?? ''))
  const title = $derived(`${t('resources.plugin.name', { smart_count: 1 })} "${id}"`)
</script>

<FormPage {title} backHref={href('/plugin')} loading={!p} {dirty} onsave={save} stayAfterSave>
  {#if p}
    {#if p.lastError}
      <div class="flex gap-2.5 rounded-xl bg-danger/10 p-4 text-body text-danger">
        <CircleAlert class="mt-0.5 size-4 shrink-0" />
        <div class="min-w-0">
          <p class="font-semibold">{t('resources.plugin.fields.lastError')}</p>
          <p class="mt-1 font-mono text-callout break-words">{p.lastError}</p>
        </div>
      </div>
    {/if}

    <FormSection title={t('resources.plugin.sections.status')}>
      <PluginToggle plugin={p} {manifest} showLabel onchange={() => plugin.reload()} />
    </FormSection>

    {#if configSchema}
      <FormSection title={t('resources.plugin.sections.configuration')}>
        <!-- Remounts with the saved config after a save or an outside change -->
        {#key `${id}:${p.config ?? ''}`}
          <SchemaForm
            schema={configSchema}
            uiSchema={manifest?.config?.uiSchema}
            value={initialConfig}
            onchange={(value, errors) => edit({ config: { value, valid: errors.length === 0 } })}
          />
        {/key}
      </FormSection>
    {/if}

    {#if perms.users}
      <FormSection title={t('resources.plugin.sections.usersPermission')}>
        {#if perms.users.reason}
          <p class="text-callout text-label-2">
            {t('resources.plugin.messages.permissionReason')}: {perms.users.reason}
          </p>
        {/if}
        {#if !allUsers && selectedUsers.length === 0}
          {@render warning(t('resources.plugin.messages.usersRequired'))}
        {/if}
        <Field
          label={t('resources.plugin.fields.allUsers')}
          for="plugin-allUsers"
          hint={t('resources.plugin.messages.allUsersHelp')}
        >
          <Switch
            id="plugin-allUsers"
            checked={allUsers}
            onCheckedChange={(v) => edit({ allUsers: v })}
          />
        </Field>
        {#if !allUsers}
          <Field label={t('resources.plugin.fields.selectedUsers')}>
            <CheckList
              items={(users.value ?? []).map((u) => ({
                id: u.id,
                label: u.name || u.userName,
                detail: u.name ? u.userName : undefined,
              }))}
              value={selectedUsers}
              emptyLabel={t('resources.plugin.messages.noUsers')}
              onchange={(ids) => edit({ users: ids })}
            />
          </Field>
        {/if}
      </FormSection>
    {/if}

    {#if perms.library}
      <FormSection title={t('resources.plugin.sections.libraryPermission')}>
        {#if perms.library.reason}
          <p class="text-callout text-label-2">
            {t('resources.plugin.messages.permissionReason')}: {perms.library.reason}
          </p>
        {/if}
        {#if !allLibraries && selectedLibraries.length === 0}
          {@render warning(t('resources.plugin.messages.librariesRequired'))}
        {/if}
        <Field
          label={t('resources.plugin.fields.allLibraries')}
          for="plugin-allLibraries"
          hint={t('resources.plugin.messages.allLibrariesHelp')}
        >
          <Switch
            id="plugin-allLibraries"
            checked={allLibraries}
            onCheckedChange={(v) => edit({ allLibraries: v })}
          />
        </Field>
        {#if perms.library.filesystem}
          <Field
            label={t('resources.plugin.fields.allowWriteAccess')}
            for="plugin-write"
            hint={t('resources.plugin.messages.allowWriteAccessHelp')}
          >
            <Switch
              id="plugin-write"
              checked={allowWriteAccess}
              onCheckedChange={(v) => edit({ allowWriteAccess: v })}
            />
          </Field>
        {/if}
        {#if !allLibraries}
          <Field label={t('resources.plugin.fields.selectedLibraries')}>
            <CheckList
              items={(libraries.value ?? []).map((l) => ({
                id: l.id,
                label: l.name,
                detail: l.path,
              }))}
              value={selectedLibraries}
              emptyLabel={t('resources.plugin.messages.noLibraries')}
              onchange={(ids) => edit({ libraries: ids })}
            />
          </Field>
        {/if}
      </FormSection>
    {/if}

    <details class="group rounded-xl bg-fill-2 ring-1 ring-divider ring-inset">
      <summary
        class="cursor-pointer px-4 py-3 text-callout font-semibold text-label-2 uppercase select-none"
      >
        {t('resources.plugin.sections.manifest')}
      </summary>
      <pre
        class="max-h-96 overflow-auto px-4 pb-4 font-mono text-callout text-label">{manifestJson}</pre>
    </details>
  {/if}

  {#snippet aside()}
    {#if p}
      <h2 class="mb-2 text-callout font-semibold text-label-2 uppercase">
        {t('resources.plugin.sections.info')}
      </h2>
      <dl class="flex flex-col gap-2.5 text-callout">
        <div>
          <dt class="text-label-2">{t('resources.plugin.fields.id')}</dt>
          <dd class="font-mono text-label">{p.id}</dd>
          <dd class="mt-0.5 text-label-3">{t('resources.plugin.messages.idHelp')}</dd>
        </div>
        {#each [['name', manifest?.name], ['version', manifest?.version], ['author', manifest?.author], ['description', manifest?.description]] as [key, value] (key)}
          {#if value}
            <div>
              <dt class="text-label-2">{t(`resources.plugin.fields.${key}`)}</dt>
              <dd class="text-label">{value}</dd>
            </div>
          {/if}
        {/each}
        {#if website}
          <div>
            <dt class="text-label-2">{t('resources.plugin.fields.website')}</dt>
            <dd>
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex max-w-full items-center gap-1 text-accent hover:underline"
              >
                <span class="truncate">{website}</span><ExternalLink class="size-3 shrink-0" />
              </a>
            </dd>
          </div>
        {/if}
        {#if Object.keys(perms).length}
          <div>
            <dt class="text-label-2">{t('resources.plugin.fields.permissions')}</dt>
            <dd class="mt-1 flex flex-col gap-2">
              {#each Object.entries(perms) as [name, perm] (name)}
                <div class="rounded-lg bg-fill-2 px-2.5 py-2">
                  <span class="font-mono font-semibold text-label">{name}</span>
                  {#if perm?.reason}<p class="text-label-2">{perm.reason}</p>{/if}
                  {#if perm?.requiredHosts?.length}
                    <p class="mt-0.5 text-label-3">
                      {t('resources.plugin.messages.requiredHosts')}:
                      {#each perm.requiredHosts as host, i (host)}{i ? ', ' : ''}<code
                          class="font-mono">{host}</code
                        >{/each}
                    </p>
                  {/if}
                </div>
              {/each}
            </dd>
          </div>
        {/if}
        <div>
          <dt class="text-label-2">{t('resources.plugin.fields.path')}</dt>
          <dd class="font-mono break-all text-label">{p.path}</dd>
        </div>
        <div>
          <dt class="text-label-2">{t('resources.plugin.fields.updatedAt')}</dt>
          <dd class="text-label">{formatDateTime(p.updatedAt)}</dd>
        </div>
        <div>
          <dt class="text-label-2">{t('resources.plugin.fields.createdAt')}</dt>
          <dd class="text-label">{formatDateTime(p.createdAt)}</dd>
        </div>
      </dl>
    {/if}
  {/snippet}
</FormPage>

{#snippet warning(message: string)}
  <div class="flex gap-2.5 rounded-xl bg-warning/10 p-3 text-callout text-label">
    <TriangleAlert class="mt-px size-4 shrink-0 text-warning" />
    <p>{message}</p>
  </div>
{/snippet}
