// Arithmetic for CSS grids of `repeat(auto-fill, minmax(<track>, 1fr))`, so paged lists can ask
// for whole rows.

/** How many columns an auto-fill grid lays out in `width` px: the CSS algorithm, floored at 1 */
export const autoFillColumns = (width: number, minTrack: number, gap: number): number =>
  Math.max(1, Math.floor((width + gap) / (minTrack + gap)))

/** `count` rounded up to whole rows of `columns`, so a full page never leaves a gap at the end */
export const fillRows = (count: number, columns: number): number =>
  columns > 0 ? Math.ceil(count / columns) * columns : count
