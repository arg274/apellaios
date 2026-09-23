import { getContext, setContext } from 'svelte'

// Navigation items render at Apple's touch sizes inside the phone navigation sheet (42px rows on a
// 48px pitch, 16px labels) and at the desktop sidebar's sizes everywhere else

const KEY = Symbol('nav-sheet')

/** Marks the navigation rendered below as the phone sheet's; call during component init */
export const setNavSheet = (sheet: () => boolean) => setContext(KEY, sheet)

/**
 * Whether the navigation is in the phone sheet, as a getter to read reactively. Call during
 * component init (it reads context); outside any sidebar it is always false.
 */
export const navSheet = (): (() => boolean) =>
  getContext<(() => boolean) | undefined>(KEY) ?? (() => false)

/** Spacing between navigation items */
export const navGap = (sheet: boolean): string => (sheet ? 'gap-1.5' : 'gap-1')
