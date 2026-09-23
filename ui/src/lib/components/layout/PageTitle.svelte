<script lang="ts">
  import { BRAND } from '$lib/brand'

  let { title }: { title: string } = $props()
</script>

<svelte:head>
  <title>{title ? `${title} - ${BRAND}` : BRAND}</title>
</svelte:head>
