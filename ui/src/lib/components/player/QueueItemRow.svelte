<script lang="ts">
  import { X } from '@lucide/svelte'
  import { t } from '$lib/i18n/index.svelte'
  import type { QueueItem } from '$lib/player/queue'
  import { cn } from '$lib/utils/cn'
  import { formatTrackDuration } from '$lib/utils/formatters'
  import Artwork from '$lib/components/media/Artwork.svelte'

  let {
    item,
    current = false,
    dimmed = false,
    onplay,
    onremove,
  }: {
    item: QueueItem
    current?: boolean
    dimmed?: boolean
    onplay: () => void
    onremove?: () => void
  } = $props()
</script>

<div
  class={cn(
    'group flex h-[55px] items-center gap-2.5 rounded-lg px-2 hover:bg-hover',
    current && 'bg-selected',
    dimmed && 'opacity-50 hover:opacity-100',
  )}
>
  <button
    type="button"
    class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
    ondblclick={onplay}
    onclick={onplay}
  >
    <div class="size-10 shrink-0">
      {#if item.kind === 'song'}
        <Artwork kind="song" record={item.song} size={40} />
      {:else}
        <Artwork kind="radio" record={item.radio} size={40} />
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      <!-- Title weighted like the player's LCD so it reads apart from the artist -->
      <div class={cn('truncate text-body font-semibold', current ? 'text-accent' : 'text-label')}>
        {item.kind === 'song' ? item.song.title : item.radio.name}
      </div>
      <div class="truncate text-callout text-label-2">
        {item.kind === 'song' ? item.song.artist : t('resources.radio.name', { smart_count: 1 })}
      </div>
    </div>
  </button>
  {#if item.kind === 'song'}
    <span class="text-callout text-label-3 tabular-nums group-hover:hidden"
      >{formatTrackDuration(item.song.duration)}</span
    >
  {/if}
  {#if onremove}
    <button
      type="button"
      aria-label={t('ra.action.remove')}
      class="hidden size-6 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger-text group-hover:flex hover:bg-danger/25 focus-visible:flex"
      onclick={onremove}
    >
      <X class="size-3.5" strokeWidth={2.5} />
    </button>
  {/if}
</div>
