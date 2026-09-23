import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { createTV } from 'tailwind-variants'

// Our type ramp names look like colours to tailwind-merge ("text-title-1" vs "text-label"),
// so it must be told they are font sizes or it drops one of the two.
const twMergeConfig = {
  extend: {
    theme: {
      text: [
        'large-title',
        'title-1',
        'title-2',
        'title-3',
        'body',
        'callout',
        'subhead',
        'footnote',
      ],
    },
  },
}

const twMerge = extendTailwindMerge(twMergeConfig)

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const tv = createTV({ twMergeConfig })

export type { VariantProps } from 'tailwind-variants'
