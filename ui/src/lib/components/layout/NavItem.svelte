<script lang="ts">
  import type { Component, Snippet } from 'svelte'
  import { cn } from '$lib/utils/cn'

  let {
    href,
    label,
    icon: Icon,
    active = false,
    class: className,
    trailing,
    ondragover,
    ondragleave,
    ondrop,
    dropTarget = false,
  }: {
    href: string
    label: string
    icon?: Component
    active?: boolean
    class?: string
    trailing?: Snippet
    ondragover?: (e: DragEvent) => void
    ondragleave?: (e: DragEvent) => void
    ondrop?: (e: DragEvent) => void
    /** Highlights the item while something droppable hovers it */
    dropTarget?: boolean
  } = $props()
</script>

<!-- Measured on music.apple.com: 36px row, 8px radius, a 24px icon box (16px glyph) at x=6 and the
     label at x=34; the icon takes the key colour only on the selected row -->
<a
  {href}
  aria-current={active ? 'page' : undefined}
  class={cn(
    'group flex h-9 items-center gap-1 rounded-lg px-1.5 text-[14px] leading-5 text-label transition-colors',
    active ? 'bg-selected font-semibold' : 'hover:bg-hover',
    dropTarget && 'bg-accent/20 ring-2 ring-accent ring-inset',
    className,
  )}
  {ondragover}
  {ondragleave}
  {ondrop}
>
  {#if Icon}
    <span class="flex size-6 shrink-0 items-center justify-center">
      <!-- Lucide glyphs leave more padding than SF Symbols; 20px here draws a ~16px glyph like Apple's -->
      <Icon class={cn('size-5', active && 'text-accent')} strokeWidth={active ? 2 : 1.6} />
    </span>
  {/if}
  <span class="min-w-0 flex-1 truncate">{label}</span>
  {@render trailing?.()}
</a>
