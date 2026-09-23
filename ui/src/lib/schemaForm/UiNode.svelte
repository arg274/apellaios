<script lang="ts">
  // One UI schema element: a layout, group, label or control. Scopes resolve against `schema`,
  // and data paths start at `base` (an array item's detail layout scopes into the item).
  import { getSchemaForm } from './context'
  import {
    evaluateRule,
    labelFor,
    resolveScope,
    type JsonSchema,
    type Path,
    type UiElement,
  } from './schema'
  import SchemaControl from './SchemaControl.svelte'
  import UiNode from './UiNode.svelte'

  let {
    ui,
    schema,
    base,
    enabled = true,
  }: { ui: UiElement; schema: JsonSchema; base: Path; enabled?: boolean } = $props()

  const ctx = getSchemaForm()
  const rule = $derived(evaluateRule(ui.rule, schema, ctx.get(base)))
  const isEnabled = $derived(enabled && rule.enabled)
  const control = $derived(
    ui.type === 'Control' && ui.scope ? resolveScope(schema, ui.scope) : null,
  )
</script>

{#snippet children(elements: UiElement[] | undefined)}
  {#each elements ?? [] as child, i (i)}
    <UiNode ui={child} {schema} {base} enabled={isEnabled} />
  {/each}
{/snippet}

{#if rule.visible}
  {#if ui.type === 'HorizontalLayout'}
    <div class="grid items-start gap-4 sm:auto-cols-fr sm:grid-flow-col">
      {@render children(ui.elements)}
    </div>
  {:else if ui.type === 'Group'}
    <fieldset class="flex flex-col gap-4 rounded-xl p-4 ring-1 ring-divider ring-inset">
      {#if ui.label}<legend class="px-1 text-callout font-semibold text-label-2"
          >{labelFor(ui, undefined, undefined)}</legend
        >{/if}
      {@render children(ui.elements)}
    </fieldset>
  {:else if ui.type === 'Label'}
    <p class="text-callout font-semibold text-label-2">{ui.text}</p>
  {:else if control}
    {#if control.schema}
      <SchemaControl
        schema={control.schema}
        path={[...base, ...control.path]}
        {ui}
        required={control.path.length === 1 && !!schema.required?.includes(control.path[0])}
        enabled={isEnabled}
      />
    {/if}
  {:else}
    <!-- VerticalLayout, and anything unknown (Categorization...) stacks its elements -->
    <div class="flex flex-col gap-4">{@render children(ui.elements)}</div>
  {/if}
{/if}
