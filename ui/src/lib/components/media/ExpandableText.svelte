<script lang="ts">
  import DOMPurify from 'dompurify'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'

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

  const safe = $derived(html ? DOMPurify.sanitize(text, { ADD_ATTR: ['target'] }) : '')

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
  it fading into the page colour.
-->
<div class={cn('relative text-body leading-4 text-label', className)}>
  <div
    bind:this={el}
    class="[&_a]:text-accent [&_a]:hover:underline"
    style:display={expanded ? 'block' : '-webkit-box'}
    style:-webkit-line-clamp={expanded ? 'none' : lines}
    style:-webkit-box-orient="vertical"
    style:overflow="hidden"
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
      class="absolute right-0 bottom-0 bg-gradient-to-r from-transparent via-page via-40% to-page pl-10 text-subhead leading-4 font-semibold text-label uppercase hover:text-accent"
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
