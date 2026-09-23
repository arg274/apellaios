<script lang="ts">
  // A list of values: each item is a card holding its own controls, always expanded, with
  // add, remove and reorder
  import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import { getSchemaForm } from './context'
  import {
    defaultLayout,
    emptyValue,
    kindOf,
    type JsonSchema,
    type Path,
    type UiElement,
  } from './schema'
  import SchemaControl from './SchemaControl.svelte'
  import UiNode from './UiNode.svelte'

  let {
    schema,
    path,
    ui,
    label,
    withLabel,
    disabled,
    error,
  }: {
    schema: JsonSchema
    path: Path
    ui?: UiElement
    label: string
    withLabel: boolean
    disabled: boolean
    error?: string
  } = $props()

  const ctx = getSchemaForm()
  const items = $derived((ctx.get(path) as unknown[] | undefined) ?? [])
  const itemSchema = $derived(schema.items ?? {})
  const isObject = $derived(kindOf(itemSchema) === 'object')
  const detail = $derived(
    (ui?.options?.detail as UiElement | undefined) ?? defaultLayout(itemSchema),
  )
  const labelProp = $derived(ui?.options?.elementLabelProp as string | undefined)

  const current = () => $state.snapshot(items) as unknown[]
  const add = () => ctx.set(path, [...current(), emptyValue(itemSchema)])
  const removeAt = (i: number) => ctx.set(path, current().toSpliced(i, 1))
  function move(i: number, to: number) {
    const next = current()
    next.splice(to, 0, ...next.splice(i, 1))
    ctx.set(path, next)
  }

  const itemTitle = (item: unknown, i: number) => {
    const named =
      labelProp && item && typeof item === 'object'
        ? (item as Record<string, unknown>)[labelProp]
        : undefined
    return named ? String(named) : `${itemSchema.title ?? label} ${i + 1}`
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between gap-2">
    {#if withLabel}<span class="text-body font-medium text-label">{label}</span>{/if}
    {#if !disabled}
      <IconButton size="sm" label={t('ra.action.add')} onclick={add}><Plus /></IconButton>
    {/if}
  </div>
  {#if error}
    <p class="text-callout text-danger">{error}</p>
  {:else if schema.description}
    <p class="text-callout text-label-2">{schema.description}</p>
  {/if}

  {#each items as item, i (i)}
    <div class="flex flex-col gap-3 rounded-xl bg-fill-2 p-3 ring-1 ring-divider ring-inset">
      <div class="flex items-center gap-1">
        <span class="min-w-0 flex-1 truncate text-callout font-semibold text-label-2"
          >{itemTitle(item, i)}</span
        >
        {#if !disabled}
          <IconButton
            size="xs"
            label={t('ra.action.move_up', { _: 'Move up' })}
            disabled={i === 0}
            onclick={() => move(i, i - 1)}><ArrowUp /></IconButton
          >
          <IconButton
            size="xs"
            label={t('ra.action.move_down', { _: 'Move down' })}
            disabled={i === items.length - 1}
            onclick={() => move(i, i + 1)}
          >
            <ArrowDown />
          </IconButton>
          <IconButton
            size="xs"
            label={t('ra.action.remove')}
            class="hover:text-danger"
            onclick={() => removeAt(i)}><Trash2 /></IconButton
          >
        {/if}
      </div>
      {#if isObject}
        <UiNode ui={detail} schema={itemSchema} base={[...path, i]} enabled={!disabled} />
      {:else}
        <SchemaControl
          schema={itemSchema}
          path={[...path, i]}
          ui={{ type: 'Control', label: false }}
          enabled={!disabled}
        />
      {/if}
    </div>
  {/each}
</div>
