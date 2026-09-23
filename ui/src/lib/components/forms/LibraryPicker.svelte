<script lang="ts">
  // Which libraries a non-admin user may access
  import type { Library } from '$lib/api/types'
  import { t } from '$lib/i18n/index.svelte'
  import CheckList from '$lib/components/ui/CheckList.svelte'

  let {
    libraries,
    value,
    onchange,
  }: { libraries: Library[]; value: number[]; onchange: (ids: number[]) => void } = $props()
</script>

<CheckList
  items={libraries.map((l) => ({ id: l.id, label: l.name, detail: l.path }))}
  {value}
  selectAllLabel={t('resources.user.message.selectAllLibraries')}
  emptyLabel={t('ra.navigation.no_results')}
  {onchange}
/>
