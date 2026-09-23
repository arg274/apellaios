<script lang="ts">
  import { Tooltip } from 'bits-ui'
  import type { Snippet } from 'svelte'

  let {
    content,
    side = 'top',
    delay = 500,
    trigger,
  }: {
    content: string
    side?: 'top' | 'bottom' | 'left' | 'right'
    delay?: number
    /** Receives the props to spread on the triggering element */
    trigger: Snippet<[Record<string, unknown>]>
  } = $props()
</script>

<Tooltip.Root delayDuration={delay}>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      {@render trigger(props)}
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content
      {side}
      sideOffset={6}
      class="glass-menu z-50 animate-fade rounded-md px-2 py-1 text-callout text-label"
    >
      {content}
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
