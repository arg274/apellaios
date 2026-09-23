<script lang="ts">
  // Renders a plugin's config schema as a form. The form owns its working copy: remount it (with
  // a {#key}) to start over from a new value.
  import { CircleAlert } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { setSchemaForm } from './context'
  import {
    defaultLayout,
    describePointer,
    getAt,
    setAt,
    validate,
    type JsonSchema,
    type Path,
    type SchemaError,
    type UiElement,
  } from './schema'
  import UiNode from './UiNode.svelte'

  let {
    schema,
    uiSchema,
    value,
    readonly = false,
    onchange,
  }: {
    schema: JsonSchema
    uiSchema?: UiElement
    value: Record<string, unknown> | undefined
    readonly?: boolean
    /** Called after every edit with a plain copy of the data and the remaining errors */
    onchange?: (value: Record<string, unknown>, errors: SchemaError[]) => void
  } = $props()

  // svelte-ignore state_referenced_locally
  const data = $state<Record<string, unknown>>(structuredClone(value ?? {}))
  // Validating also fills in the schema's defaults, as JSONForms did on first render
  // svelte-ignore state_referenced_locally
  let errors = $state<SchemaError[]>(validate(schema, data))
  const errorMap = $derived(new Map(errors.map((e) => [e.pointer, e.message])))

  setSchemaForm({
    get rootSchema() {
      return schema
    },
    get readonly() {
      return readonly
    },
    get: (path: Path) => getAt(data, path),
    set(path: Path, v: unknown) {
      setAt(data, path, v)
      errors = validate(schema, data)
      onchange?.($state.snapshot(data), errors)
    },
    errorAt: (pointer: string) => errorMap.get(pointer),
  })
</script>

<div class="flex flex-col gap-4">
  {#if errors.length}
    <div class="flex gap-2.5 rounded-xl bg-danger/10 p-3 text-callout text-danger">
      <CircleAlert class="mt-px size-4 shrink-0" />
      <div>
        {t('resources.plugin.messages.configValidationError')}
        <ul class="mt-1 list-disc pl-4">
          {#each errors as e, i (i)}
            <li>
              <span class="font-semibold">{describePointer(schema, e.pointer) || '—'}</span>: {e.message}
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}

  <!-- A schema the renderer can't handle shouldn't take the whole page down -->
  <svelte:boundary>
    <UiNode ui={uiSchema ?? defaultLayout(schema)} {schema} base={[]} />
    {#snippet failed(error)}
      <div class="rounded-xl p-3 text-callout ring-1 ring-danger">
        <p class="text-danger">{t('resources.plugin.messages.schemaRenderError')}</p>
        <p class="mt-1 font-mono text-label-2">{(error as Error)?.message ?? String(error)}</p>
      </div>
    {/snippet}
  </svelte:boundary>
</div>
