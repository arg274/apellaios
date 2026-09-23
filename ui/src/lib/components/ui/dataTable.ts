export interface DataColumn<R> {
  id: string
  label: string
  /** Server sort field; omit for unsortable columns */
  sort?: string
  /** Plain text value; columns without one are rendered by the table's `cell` snippet */
  value?: (row: R) => string | number | null | undefined
  class?: string
  headerClass?: string
  align?: 'left' | 'right' | 'center'
}
