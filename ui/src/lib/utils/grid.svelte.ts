// Card grids of `repeat(auto-fill, minmax(<track>, 1fr))`, paged by whole rows so a full page
// never ends on a part-filled row.

/** How many columns an auto-fill grid lays out in `width` px: the CSS algorithm, floored at 1 */
export const autoFillColumns = (width: number, minTrack: number, gap: number): number =>
  Math.max(1, Math.floor((width + gap) / (minTrack + gap)))

/**
 * Columns of a grid whose minimum track widens from `base` to `sm` px at Tailwind's sm breakpoint
 * (`grid-cols-[...minmax(<base>px,1fr)] sm:grid-cols-[...minmax(<sm>px,1fr)]`), 20px gutters
 */
export const responsiveColumns = (width: number, base: number, sm: number, gap = 20): number =>
  autoFillColumns(width, matchMedia('(min-width: 40rem)').matches ? sm : base, gap)

/** `count` rounded up to whole rows of `columns`, so a full page never leaves a gap at the end */
export const fillRows = (count: number, columns: number): number =>
  columns > 0 ? Math.ceil(count / columns) * columns : count

/**
 * Page size for a paged list shown as a grid: the chosen page size rounded up to whole rows at the
 * list area's width (bind it to `width`). Until that is measured the size is unknown, so `ready`
 * stays false and the list should hold its fetch. Other views use the chosen size as is.
 */
export class GridPages {
  /** Width of the list area in px */
  width = $state(0)
  #grid: () => boolean
  #perPage: () => number
  #columns: (width: number) => number

  constructor(opts: {
    grid: () => boolean
    perPage: () => number
    columns: (width: number) => number
  }) {
    this.#grid = opts.grid
    this.#perPage = opts.perPage
    this.#columns = opts.columns
  }

  get ready(): boolean {
    return !this.#grid() || this.width > 0
  }

  get pageSize(): number {
    const perPage = this.#perPage()
    if (!this.#grid() || !this.width) return perPage
    return fillRows(perPage, this.#columns(this.width))
  }
}
