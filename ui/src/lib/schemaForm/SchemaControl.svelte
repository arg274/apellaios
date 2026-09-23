<script lang="ts">
  // The input for one schema value, picked by type. Objects and arrays recurse.
  import { getSchemaForm } from './context'
  import {
    defaultLayout,
    enumOptions,
    kindOf,
    labelFor,
    showsLabel,
    toPointer,
    type JsonSchema,
    type Path,
    type UiElement,
  } from './schema'
  import ArrayControl from './ArrayControl.svelte'
  import UiNode from './UiNode.svelte'
  import Input from '$lib/components/ui/Input.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'
  import Textarea from '$lib/components/ui/Textarea.svelte'

  let {
    schema,
    path,
    ui,
    required = false,
    enabled = true,
  }: {
    schema: JsonSchema
    path: Path
    ui?: UiElement
    required?: boolean
    enabled?: boolean
  } = $props()

  const ctx = getSchemaForm()
  const kind = $derived(kindOf(schema))
  const value = $derived(ctx.get(path))
  const error = $derived(ctx.errorAt(toPointer(path)))
  const id = $derived(`sf${toPointer(path).replace(/[^\w-]/g, '-')}`)
  const label = $derived(labelFor(ui, schema, path.at(-1)))
  const withLabel = $derived(showsLabel(ui))
  const disabled = $derived(ctx.readonly || !enabled || schema.readOnly === true)
  const options = $derived(ui?.options ?? {})
  const secret = $derived(options.format === 'password' || schema.format === 'password')

  const enumChoices = $derived(kind === 'enum' ? enumOptions(schema) : [])
  // Cleared inputs remove the value, so `required` and defaults behave as in JSONForms
  const setText = (v: string) => ctx.set(path, v === '' ? undefined : v)
  const setNumber = (v: string) =>
    ctx.set(path, v === '' || isNaN(Number(v)) ? undefined : Number(v))
</script>

{#snippet header()}
  {#if withLabel}
    <label for={id} class="text-body font-medium text-label">
      {label}{#if required}<span class="text-label-3"> *</span>{/if}
    </label>
  {/if}
{/snippet}

{#snippet footer()}
  {#if error}
    <p class="text-callout text-danger">{error}</p>
  {:else if schema.description}
    <p class="text-callout text-label-2">{schema.description}</p>
  {/if}
{/snippet}

{#if kind === 'object'}
  <fieldset class="flex flex-col gap-4 rounded-xl p-4 ring-1 ring-divider ring-inset">
    {#if withLabel}<legend class="px-1 text-callout font-semibold text-label-2">{label}</legend
      >{/if}
    <UiNode
      ui={(options.detail as UiElement | undefined) ?? defaultLayout(schema)}
      {schema}
      base={path}
      {enabled}
    />
  </fieldset>
{:else if kind === 'array'}
  <ArrayControl {schema} {path} {ui} {label} {withLabel} {disabled} {error} />
{:else if kind === 'boolean'}
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-4">
      {@render header()}
      <Switch {id} checked={value === true} {disabled} onCheckedChange={(v) => ctx.set(path, v)} />
    </div>
    {@render footer()}
  </div>
{:else}
  <div class="flex flex-col gap-1.5">
    {@render header()}
    {#if kind === 'enum'}
      <Select
        {id}
        class="w-full"
        {disabled}
        value={enumChoices.findIndex((o) => o.value === value) >= 0
          ? String(enumChoices.findIndex((o) => o.value === value))
          : ''}
        options={enumChoices.map((o, i) => ({ value: String(i), label: o.label }))}
        onValueChange={(i) => ctx.set(path, enumChoices[Number(i)]?.value)}
      />
    {:else if kind === 'number' || kind === 'integer'}
      <Input
        {id}
        type="number"
        step={kind === 'integer' ? 1 : 'any'}
        min={schema.minimum as number | undefined}
        max={schema.maximum as number | undefined}
        value={value === undefined ? '' : String(value)}
        {disabled}
        invalid={!!error}
        autocomplete="off"
        oninput={(e) => setNumber(e.currentTarget.value)}
      />
    {:else if kind === 'string' && options.multi}
      <Textarea
        {id}
        value={(value as string) ?? ''}
        rows={4}
        {disabled}
        spellcheck={false}
        oninput={(e) => setText(e.currentTarget.value)}
      />
    {:else if kind === 'string'}
      <Input
        {id}
        type={secret ? 'password' : 'text'}
        value={(value as string) ?? ''}
        {disabled}
        invalid={!!error}
        autocomplete={secret ? 'new-password' : 'off'}
        spellcheck={false}
        oninput={(e) => setText(e.currentTarget.value)}
      />
    {:else}
      <!-- Types the form can't edit are shown as JSON rather than dropped -->
      <pre
        class="overflow-x-auto rounded-lg bg-fill-2 p-2 font-mono text-callout text-label-2">{JSON.stringify(
          value,
          null,
          2,
        ) ?? '—'}</pre>
    {/if}
    {@render footer()}
  </div>
{/if}
