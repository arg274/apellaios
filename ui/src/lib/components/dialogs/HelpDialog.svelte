<script lang="ts">
  import config from '$lib/config'
  import { t } from '$lib/i18n/index.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'

  // Mirrors Hotkeys.svelte
  const keys: [string, string[]][] = [
    ['show_help', ['?']],
    ['toggle_menu', ['M']],
    ['toggle_play', ['Space']],
    ['prev_song', ['←']],
    ['next_song', ['→']],
    ['current_song', ['⇧', 'C']],
    ['vol_up', ['=']],
    ['vol_down', ['-']],
    ...(config.enableFavourites ? ([['toggle_love', ['L']]] as [string, string[]][]) : []),
  ]
</script>

<Dialog bind:open={ui.help} title={t('help.title')} size="sm">
  <dl class="flex flex-col divide-y divide-divider text-body">
    {#each keys as [name, combo] (name)}
      <div class="flex items-center justify-between gap-4 py-2">
        <dt class="text-label">{t(`help.hotkeys.${name}`)}</dt>
        <dd class="flex gap-1">
          {#each combo as k (k)}
            <kbd
              class="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-fill px-1.5 font-sans text-callout font-semibold text-label ring-1 ring-divider ring-inset"
              >{k}</kbd
            >
          {/each}
        </dd>
      </div>
    {/each}
  </dl>
</Dialog>
