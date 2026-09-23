<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte'
  import type { Snippet } from 'svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'

  let {
    title,
    href: seeAll,
    class: className,
    children,
  }: {
    title: string
    /** "See all" target; the title becomes a link with a chevron, like Apple's shelves */
    href?: string
    class?: string
    children: Snippet
  } = $props()

  let scroller = $state<HTMLElement | null>(null)
  let canLeft = $state(false)
  let canRight = $state(false)

  const update = () => {
    if (!scroller) return
    canLeft = scroller.scrollLeft > 4
    canRight = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4
  }

  $effect(() => {
    if (!scroller) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(scroller)
    return () => ro.disconnect()
  })

  const page = (dir: 1 | -1) =>
    scroller?.scrollBy({ left: dir * scroller.clientWidth * 0.9, behavior: 'smooth' })
</script>

<section class={cn('group/shelf relative', className)}>
  <h2 class="mb-3 text-title-2 font-bold text-label">
    {#if seeAll}
      <a
        href={seeAll}
        class="inline-flex items-center gap-0.5 hover:opacity-80"
        aria-label="{title}, {t('ui.seeAll')}"
      >
        {title}<ChevronRight class="size-4 text-label-2" strokeWidth={2.5} />
      </a>
    {:else}
      {title}
    {/if}
  </h2>
  <div
    bind:this={scroller}
    onscroll={update}
    class="-mx-1 scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2 [&>*]:shrink-0 [&>*]:snap-start"
  >
    {@render children()}
  </div>
  {#if canLeft}
    <button
      type="button"
      aria-label={t('ui.previous')}
      class="glass absolute top-[calc(50%-4px)] -left-4 hidden size-8 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/shelf:opacity-100 lg:flex"
      onclick={() => page(-1)}
    >
      <ChevronLeft class="size-4" />
    </button>
  {/if}
  {#if canRight}
    <button
      type="button"
      aria-label={t('ui.next')}
      class="glass absolute top-[calc(50%-4px)] -right-4 hidden size-8 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/shelf:opacity-100 lg:flex"
      onclick={() => page(1)}
    >
      <ChevronRight class="size-4" />
    </button>
  {/if}
</section>
