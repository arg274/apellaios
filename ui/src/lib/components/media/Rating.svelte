<script lang="ts">
  import { Star } from '@lucide/svelte'
  import config from '$lib/config'
  import { rate } from '$lib/actions.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'

  let {
    id,
    rating = $bindable(0),
    size = 'sm',
    readonly = false,
    class: className,
  }: {
    id: string
    rating?: number
    size?: 'sm' | 'md'
    readonly?: boolean
    class?: string
  } = $props()

  let hover = $state(0)
  const shown = $derived(hover || rating || 0)

  async function set(value: number, e: MouseEvent) {
    e.stopPropagation()
    // Clicking the current rating clears it, like the legacy RatingField
    const next = value === rating ? 0 : value
    const before = rating
    rating = next
    if (!(await rate(id, next))) rating = before
  }
</script>

{#if config.enableStarRating}
  <span
    class={cn('inline-flex items-center', className)}
    role="group"
    aria-label={t('resources.song.fields.rating')}
    onmouseleave={() => (hover = 0)}
  >
    {#each [1, 2, 3, 4, 5] as n (n)}
      <button
        type="button"
        aria-pressed={n <= (rating ?? 0)}
        aria-label={String(n)}
        disabled={readonly}
        class={cn(
          'flex items-center justify-center transition-colors disabled:cursor-default',
          size === 'sm' ? 'size-4 [&_svg]:size-3' : 'size-6 [&_svg]:size-4.5',
          n <= shown ? 'text-accent' : 'text-label-3',
        )}
        onmouseenter={() => !readonly && (hover = n)}
        onclick={(e) => set(n, e)}
      >
        <Star fill={n <= shown ? 'currentColor' : 'none'} />
      </button>
    {/each}
  </span>
{/if}
