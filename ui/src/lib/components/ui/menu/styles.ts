// Apple's contextual menu: 185px+ wide, 6px radius, 32px rows, 13px text, icons on the right
export const menuContent =
  'glass-menu animate-pop origin-floating z-50 min-w-[200px] max-h-[var(--bits-dropdown-menu-content-available-height,80vh)] overflow-y-auto rounded-[8px] p-1 text-body text-label outline-none'

export const menuItem =
  'relative flex h-8 cursor-default select-none items-center gap-3 rounded-[5px] px-2.5 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent data-[highlighted]:text-on-accent [&_svg]:size-4 [&_svg]:shrink-0'

export const menuSeparator = 'mx-2.5 my-1 h-px bg-divider'

export const menuLabel = 'px-2.5 pt-1.5 pb-1 text-subhead font-semibold text-label-3'
