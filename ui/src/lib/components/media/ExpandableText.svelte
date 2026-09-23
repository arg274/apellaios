<script lang="ts">
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'
  import { sanitizeHtml } from '$lib/utils/sanitize'

  let {
    text,
    html = false,
    lines = 3,
    class: className,
  }: {
    text: string
    /** Sanitised with DOMPurify before rendering (external bios/notes contain links) */
    html?: boolean
    lines?: number
    class?: string
  } = $props()

  let expanded = $state(false)
  let el = $state<HTMLElement | null>(null)
  let overflowing = $state(false)
  let moreWidth = $state(0)

  const safe = $derived(html ? sanitizeHtml(text) : '')

  $effect(() => {
    void text
    void expanded
    if (!el || expanded) return
    const measure = () => (overflowing = el!.scrollHeight > el!.clientHeight + 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
</script>

<!--
  Apple's clamped editorial text: MORE sits at the end of the last visible line, the words under
  it fading out.
-->
<div class={cn('relative text-body leading-4 text-label', className)}>
  <div
    bind:this={el}
    class={cn(
      '[&_a]:text-accent [&_a]:hover:underline',
      !expanded && 'line-clamp-(--lines)',
      overflowing && !expanded && 'fade-under-more',
    )}
    style:--lines={lines}
    style:--more="{moreWidth}px"
  >
    {#if html}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitised with DOMPurify -->
      {@html safe}
    {:else}
      <span class="whitespace-pre-line">{text}</span>
    {/if}
  </div>
  {#if overflowing && !expanded}
    <button
      type="button"
      bind:clientWidth={moreWidth}
      class="absolute right-0 bottom-0 text-subhead leading-4 font-semibold text-label uppercase hover:text-accent"
      onclick={() => (expanded = true)}
    >
      {t('ui.showMore')}
    </button>
  {:else if expanded}
    <button
      type="button"
      class="mt-1 text-subhead font-semibold text-label uppercase hover:text-accent"
      onclick={() => (expanded = false)}
    >
      {t('ui.showLess')}
    </button>
  {/if}
</div>
