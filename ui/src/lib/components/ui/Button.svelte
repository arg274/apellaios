<script lang="ts" module>
  import { tv, type VariantProps } from '$lib/utils/cn'

  export const buttonVariants = tv({
    base: 'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-[background-color,color,transform,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0',
    variants: {
      variant: {
        /** Apple's key-colour pill ("Play", "Shuffle") */
        primary: 'bg-accent text-on-accent hover:brightness-110',
        /** Quiet pill on a translucent fill */
        secondary: 'bg-fill text-label hover:bg-fill/80 dark:hover:bg-white/15',
        /** Tinted: key colour text on a faint key-colour fill */
        tinted: 'bg-accent/15 text-accent hover:bg-accent/20',
        /** Text-only, key colour */
        plain: 'text-accent hover:opacity-80',
        ghost: 'text-label hover:bg-hover',
        danger: 'bg-danger text-white hover:brightness-110',
        /** Soft destructive: red text on a faint red fill (Clear, Remove) */
        destructive: 'bg-danger/15 text-danger-text hover:bg-danger/20',
        glass: 'glass text-label',
      },
      size: {
        sm: 'h-7 rounded-full px-3 text-callout [&_svg]:size-3.5',
        md: 'h-8 rounded-full px-4 text-body [&_svg]:size-4',
        /** Apple's primary album actions: 36px, 12px sides, 24px radius, 15/20 semibold, 15px glyph */
        lg: 'h-9 min-w-[130px] rounded-[24px] px-3 text-[15px] leading-5 [&_svg]:size-[15px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  })

  export type ButtonVariant = VariantProps<typeof buttonVariants>['variant']
  export type ButtonSize = VariantProps<typeof buttonVariants>['size']
</script>

<script lang="ts">
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements'

  type Props = {
    variant?: ButtonVariant
    size?: ButtonSize
    href?: string
    class?: string
  } & (HTMLButtonAttributes & HTMLAnchorAttributes)

  let {
    variant,
    size,
    href,
    class: className,
    type = 'button',
    children,
    ...rest
  }: Props = $props()
</script>

{#if href}
  <a {href} class={buttonVariants({ variant, size, class: className })} {...rest}>
    {@render children?.()}
  </a>
{:else}
  <button {type} class={buttonVariants({ variant, size, class: className })} {...rest}>
    {@render children?.()}
  </button>
{/if}
