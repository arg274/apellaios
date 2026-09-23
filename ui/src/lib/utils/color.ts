/** Relative luminance of a #rrggbb colour, 0..1 */
export const luminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

const isHex = (hex: string | null | undefined): hex is string =>
  !!hex && /^#[0-9a-f]{6}$/i.test(hex)

/**
 * Whether an artwork-tinted page needs light text. Apple overrides the app's scheme per page:
 * in dark mode the tint is always darkened, in light mode a dark cover still gets light text.
 */
export const tintIsDark = (hex: string | null | undefined, systemDark: boolean): boolean =>
  isHex(hex) && (systemDark || luminance(hex) < 0.18)

/**
 * The flat page colour for an artwork: in a dark scheme a deep version of it (Apple turns
 * #aeb5c9 into #282d3d, i.e. same hue, lightness pinned near 0.3), in a light one the colour itself.
 */
export const pageTint = (hex: string | null | undefined, dark: boolean): string | null => {
  if (!isHex(hex)) return null
  return dark ? `oklch(from ${hex} min(l, 0.3) c h)` : hex
}

/**
 * An accent taken from the artwork, for pages it tints: the tint's own hue with its lightness
 * pushed away from the page, so controls stand out without clashing. On a light page it is a deep
 * version (half the tint's lightness, about the secondary text's) under white text; on a dark one
 * a light version under black text. Grey covers give a grey accent.
 */
export const tintAccent = (
  hex: string | null | undefined,
  dark: boolean,
): { accent: string; onAccent: string } | null => {
  if (!isHex(hex)) return null
  return dark
    ? { accent: `oklch(from ${hex} clamp(0.72, l, 0.84) min(c * 1.4, 0.2) h)`, onAccent: '#000000' }
    : { accent: `oklch(from ${hex} calc(l * 0.45) min(c * 1.5, 0.2) h)`, onAccent: '#ffffff' }
}
