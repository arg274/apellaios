import type { Component } from 'svelte'

// Menus are described as data so the same definition can back a "..." dropdown and a
// right-click context menu, the way Apple Music offers both on every row and card.

export interface MenuAction {
  type?: 'item'
  label: string
  icon?: Component
  onSelect: () => void
  disabled?: boolean
  /** Rendered in the danger colour (delete, remove...) */
  danger?: boolean
  /** Keyboard hint shown on the right */
  shortcut?: string
}

export interface MenuSeparator {
  type: 'separator'
}

export interface MenuLabel {
  type: 'label'
  label: string
}

export interface MenuCheckbox {
  type: 'checkbox'
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export interface MenuSub {
  type: 'sub'
  label: string
  icon?: Component
  items: MenuEntry[]
  disabled?: boolean
}

/** A submenu whose entries are fetched when the parent menu opens */
export interface MenuAsyncSub {
  type: 'asyncSub'
  label: string
  icon?: Component
  load: () => Promise<MenuEntry[]>
  /** Shown when `load` resolves to nothing */
  emptyLabel: string
  loadingLabel: string
}

export type MenuEntry =
  MenuAction | MenuSeparator | MenuLabel | MenuCheckbox | MenuSub | MenuAsyncSub

/** Filters out falsy entries and collapses leading, trailing and doubled separators */
export function menu(...entries: (MenuEntry | false | null | undefined)[]): MenuEntry[] {
  const out: MenuEntry[] = []
  for (const e of entries) {
    if (!e) continue
    if (e.type === 'separator' && (out.length === 0 || out[out.length - 1].type === 'separator'))
      continue
    out.push(e)
  }
  while (out.length && out[out.length - 1].type === 'separator') out.pop()
  return out
}

export const separator: MenuSeparator = { type: 'separator' }
