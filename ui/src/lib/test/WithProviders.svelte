<script lang="ts" generics="P extends Record<string, unknown>">
  // Test-only wrapper: mounts a component inside the providers the app layout supplies
  import { Tooltip } from 'bits-ui'
  import type { Component } from 'svelte'

  let { component: Inner, props }: { component: Component<P>; props: P } = $props()
</script>

<Tooltip.Provider>
  <Inner {...props} />
</Tooltip.Provider>
