<script lang="ts">
  import type { Snippet } from 'svelte'
  import { BRAND } from '$lib/brand'
  import { cn } from '$lib/utils/cn'

  let {
    title,
    subtitle,
    class: className,
    actions,
  }: { title: string; subtitle?: string; class?: string; actions?: Snippet } = $props()
</script>

<svelte:head>
  <title>{title} - {BRAND}</title>
</svelte:head>

<!-- Apple's header-nav: a 34/40 bold title in a 40px row, content 28px below. On phones the
     actions drop below the title, the search field on a line of its own and the rest after it -->
<header
  class={cn('mb-7 flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-5', className)}
>
  <div class="min-w-0">
    <h1 class="text-[34px] leading-10 font-bold text-label">{title}</h1>
    {#if subtitle}
      <p class="mt-0.5 text-body text-label-2">{subtitle}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {@render actions()}
    </div>
  {/if}
</header>
