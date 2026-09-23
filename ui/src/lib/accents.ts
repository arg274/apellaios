// Accent colours, Apple's system palette with separate dark/light values for contrast. The full
// theming story is still to be designed; for now a user picks a scheme and one of these.

export type Scheme = 'auto' | 'light' | 'dark'

export interface Accent {
  id: string
  /** i18n key under ui.accents */
  label: string
  dark: string
  light: string
}

export const ACCENTS: Accent[] = [
  { id: 'blue', label: 'Blue', dark: '#0a84ff', light: '#007aff' },
  { id: 'red', label: 'Red', dark: '#fa586a', light: '#fa2d48' },
  { id: 'orange', label: 'Orange', dark: '#ff9f0a', light: '#f56300' },
  { id: 'yellow', label: 'Yellow', dark: '#ffd60a', light: '#c79c00' },
  { id: 'green', label: 'Green', dark: '#32d74b', light: '#248a3d' },
  { id: 'teal', label: 'Teal', dark: '#40c8e0', light: '#0071a4' },
  { id: 'indigo', label: 'Indigo', dark: '#5e5ce6', light: '#3634a3' },
  { id: 'purple', label: 'Purple', dark: '#bf5af2', light: '#8944ab' },
  { id: 'pink', label: 'Pink', dark: '#ff375f', light: '#d30f45' },
  { id: 'graphite', label: 'Graphite', dark: '#98989d', light: '#6e6e73' },
]

export const DEFAULT_ACCENT = 'blue'

export const findAccent = (id: string | undefined | null): Accent =>
  ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]

/** Dark text reads better on the bright accents */
export const onAccent = (accent: Accent, dark: boolean) =>
  dark && (accent.id === 'yellow' || accent.id === 'teal') ? '#000000' : '#ffffff'
