<script lang="ts">
  import { History, Save } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { player } from '$lib/player/player.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { cn } from '$lib/utils/cn'
  import Button from '$lib/components/ui/Button.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import QueueItemRow from './QueueItemRow.svelte'

  let { class: className }: { class?: string } = $props()

  let showHistory = $state(false)

  // Drag to reorder within the queue (HTML5 drag and drop keeps it keyboard-free but native)
  let dragFrom = $state<number | null>(null)
  let dragOver = $state<number | null>(null)

  const start = $derived(showHistory ? 0 : Math.max(player.index, 0))
  const rows = $derived(player.queue.slice(start).map((item, i) => ({ item, index: start + i })))
</script>

<aside
  class={cn('flex-col border-l border-sidebar-edge glass-sidebar', className)}
  aria-label={t('ui.upNext')}
>
  <!-- Lowered so "Up Next" lines up with the page titles' cap height, 39px from the top -->
  <header class="mt-2.5 flex h-[72px] shrink-0 items-center justify-between gap-2 px-5">
    <h2 class="text-title-2 font-bold">{t('ui.upNext')}</h2>
    <div class="flex items-center gap-1.5">
      <IconButton
        size="sm"
        variant="filled"
        label={t('ui.history')}
        active={showHistory}
        class={showHistory ? 'bg-accent/15 hover:bg-accent/20' : ''}
        onclick={() => (showHistory = !showHistory)}
      >
        <History />
      </IconButton>
      <IconButton
        size="sm"
        variant="filled"
        label={t('ui.saveQueue')}
        disabled={player.isRadio}
        onclick={() => (ui.saveQueue = true)}
      >
        <Save />
      </IconButton>
      <Button
        size="sm"
        variant="destructive"
        disabled={!player.upcoming.length}
        onclick={player.clearUpcoming}
      >
        {t('ui.clear')}
      </Button>
    </div>
  </header>
  <ol class="min-h-0 flex-1 overflow-y-auto px-3 pb-28">
    {#each rows as { item, index } (item.uuid)}
      <li
        draggable="true"
        class={cn(dragOver === index && dragFrom !== index && 'border-t-2 border-accent')}
        ondragstart={(e) => {
          dragFrom = index
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
        }}
        ondragover={(e) => {
          if (dragFrom === null) return
          e.preventDefault()
          dragOver = index
        }}
        ondrop={(e) => {
          e.preventDefault()
          if (dragFrom !== null) player.moveItem(dragFrom, dragFrom < index ? index - 1 : index)
          dragFrom = dragOver = null
        }}
        ondragend={() => (dragFrom = dragOver = null)}
      >
        <QueueItemRow
          {item}
          current={index === player.index}
          dimmed={index < player.index}
          onplay={() => player.jumpTo(index)}
          onremove={() => player.remove([index])}
        />
      </li>
    {/each}
  </ol>
</aside>
