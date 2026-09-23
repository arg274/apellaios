/**
 * The product name shown to users. Display text only: identifiers the server or stored data
 * depend on (the "NavidromeUI" API client name, localStorage keys, docs URLs) stay unchanged.
 */
export const BRAND = 'Apellaios'

/** Rebrands user-facing copy that names Navidrome, e.g. translated strings */
export const rebrand = (text: string): string => text.replace(/\bNavidrome\b/g, BRAND)
