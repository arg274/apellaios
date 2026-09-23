<script lang="ts">
  import { Heart } from '@lucide/svelte'
  import config from '$lib/config'
  import { toggleStar } from '$lib/actions.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'

  let {
    id,
    starred = $bindable(false),
    size = 'md',
    class: className,
    onchange,
  }: {
    id: string
    starred?: boolean
    size?: 'sm' | 'md' | 'lg'
    class?: string
    onchange?: (starred: boolean) => void
  } = $props()

  let busy = $state(false)

  async function toggle(e: MouseEvent) {
    e.stopPropagation()
    if (busy) return
    busy = true
    const before = starred
    starred = !before // optimistic
    const next = await toggleStar({ id, starred: before })
    if (next === undefined) starred = before
    else onchange?.(next)
    busy = false
  }

  const sizes = {
    sm: 'size-6 [&_svg]:size-3.5',
    md: 'size-8 [&_svg]:size-4',
    lg: 'size-10 [&_svg]:size-5',
  }
</script>

{#if config.enableFavourites}
  <button
    type="button"
    aria-label={starred ? t('ui.removeFromFavourites') : t('ui.addToFavourites')}
    aria-pressed={starred}
    class={cn(
      'inline-flex shrink-0 items-center justify-center rounded-full transition-[color,transform] active:scale-90',
      starred ? 'text-accent' : 'text-label-3 hover:text-label',
      sizes[size],
      className,
    )}
    onclick={toggle}
  >
    <Heart fill={starred ? 'currentColor' : 'none'} />
  </button>
{/if}
