<script lang="ts">
  import { Dialog } from 'bits-ui'
  import { X } from '@lucide/svelte'
  import type { Snippet } from 'svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { cn } from '$lib/utils/cn'

  let {
    open = $bindable(false),
    title,
    description,
    size = 'md',
    class: className,
    children,
    footer,
    onOpenChange,
  }: {
    open?: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    class?: string
    children?: Snippet
    footer?: Snippet
    onOpenChange?: (open: boolean) => void
  } = $props()

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 animate-fade bg-scrim" />
    <Dialog.Content
      class={cn(
        'glass-menu fixed top-1/2 left-1/2 z-50 flex max-h-[min(85dvh,52rem)] w-[calc(100vw-2rem)] origin-floating -translate-x-1/2 -translate-y-1/2 animate-pop flex-col rounded-2xl text-label outline-none',
        widths[size],
        className,
      )}
    >
      {#if title}
        <header class="flex items-start gap-3 px-5 pt-5 pb-3">
          <div class="min-w-0 flex-1">
            <Dialog.Title class="text-title-2 font-bold">{title}</Dialog.Title>
            {#if description}
              <Dialog.Description class="mt-1 text-body text-label-2"
                >{description}</Dialog.Description
              >
            {/if}
          </div>
          <Dialog.Close
            class="-mt-1 -mr-1 flex size-7 items-center justify-center rounded-full bg-fill text-label-2 hover:text-label"
            aria-label={t('ra.action.close')}
          >
            <X class="size-4" />
          </Dialog.Close>
        </header>
      {/if}
      <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5 {title ? '' : 'pt-5'}">
        {@render children?.()}
      </div>
      {#if footer}
        <footer class="flex items-center justify-end gap-2 border-t border-divider px-5 py-3">
          {@render footer()}
        </footer>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
