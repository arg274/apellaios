<script lang="ts" module>
  import { tv, type VariantProps } from '$lib/utils/cn'

  export const iconButtonVariants = tv({
    base: 'inline-flex shrink-0 select-none items-center justify-center rounded-full transition-[background-color,color,transform,opacity] duration-150 active:scale-90 disabled:pointer-events-none disabled:opacity-35',
    variants: {
      variant: {
        plain: 'text-label-2 hover:text-label',
        ghost: 'text-label-2 hover:bg-hover hover:text-label',
        /** Apple's small circular glass buttons (artist page "i", star) */
        glass: 'glass text-label',
        /** The big white play platter */
        platter: 'bg-white text-black/80 shadow-lg hover:scale-105',
        accent: 'bg-accent text-on-accent hover:brightness-110',
        filled: 'bg-fill text-label hover:bg-fill/80',
      },
      size: {
        xs: 'size-6 [&_svg]:size-3.5',
        sm: 'size-7 [&_svg]:size-4',
        md: 'size-8 [&_svg]:size-[18px]',
        lg: 'size-10 [&_svg]:size-5',
        xl: 'size-14 [&_svg]:size-7',
      },
      active: {
        true: 'text-accent hover:text-accent',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  })

  export type IconButtonVariant = VariantProps<typeof iconButtonVariants>['variant']
  export type IconButtonSize = VariantProps<typeof iconButtonVariants>['size']
</script>

<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import Tooltip from './Tooltip.svelte'

  type Props = HTMLButtonAttributes & {
    /** Accessible name; also shown as a tooltip unless `tooltip` is false */
    label: string
    variant?: IconButtonVariant
    size?: IconButtonSize
    active?: boolean
    tooltip?: boolean
    ref?: HTMLButtonElement | null
  }

  let {
    label,
    variant,
    size,
    active = false,
    tooltip = true,
    class: className,
    type = 'button',
    ref = $bindable(null),
    children,
    ...rest
  }: Props = $props()
</script>

{#snippet button(props: Record<string, unknown> = {})}
  <button
    bind:this={ref}
    {type}
    aria-label={label}
    aria-pressed={active || undefined}
    class={iconButtonVariants({ variant, size, active, class: className as string })}
    {...props}
    {...rest}
  >
    {@render children?.()}
  </button>
{/snippet}

{#if tooltip}
  <Tooltip content={label}>
    {#snippet trigger(props)}
      {@render button(props)}
    {/snippet}
  </Tooltip>
{:else}
  {@render button()}
{/if}
