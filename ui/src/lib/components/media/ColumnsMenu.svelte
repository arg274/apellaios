<script lang="ts">
  import { Columns3 } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import type { MenuEntry } from '$lib/components/ui/menu/types'
  import { COLUMNS, columnEnabled, type ColumnId } from './songColumns'

  let {
    listKey,
    columns,
    defaultOff = [],
  }: {
    /** Must match the SongTable's listKey */
    listKey: string
    columns: ColumnId[]
    defaultOff?: ColumnId[]
  } = $props()

  const items = (): MenuEntry[] => [
    { type: 'label', label: t('ui.columns') },
    ...columns
      .filter((c) => c !== 'title' && columnEnabled(c))
      .map((c) => ({
        type: 'checkbox' as const,
        label: c === 'trackNumber' ? t('resources.song.fields.trackNumber') : t(COLUMNS[c].label),
        checked: settings.column(listKey, c, !defaultOff.includes(c)),
        onCheckedChange: (v: boolean) => settings.setColumn(listKey, c, v),
      })),
  ]
</script>

<ActionMenu {items}>
  {#snippet trigger(props)}
    <IconButton {...props} label={t('ui.columns')} variant="filled" size="sm" tooltip={false}>
      <Columns3 />
    </IconButton>
  {/snippet}
</ActionMenu>
