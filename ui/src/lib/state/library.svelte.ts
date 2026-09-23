import type { Library } from '$lib/api/types'
import { legacyState, persisted } from './persisted.svelte'

interface LibraryStore {
  userLibraries: Pick<Library, 'id' | 'name'>[]
  /** Empty means "every library the user can access" */
  selectedLibraries: number[]
}

class LibrarySelection {
  #store = persisted<LibraryStore>(
    'nd-library',
    { userLibraries: [], selectedLibraries: [] },
    () => (legacyState()?.library as Partial<LibraryStore>) ?? {},
  )

  get userLibraries() {
    return this.#store.userLibraries
  }

  get selected() {
    return this.#store.selectedLibraries
  }

  /** True when the user can see more than one library, so a selector is worth showing */
  get hasMultiple() {
    return this.#store.userLibraries.length > 1
  }

  /**
   * The library ids content queries should filter on, or [] for no filter. Selections are
   * validated against the current libraries so a revoked library never leaks into a query.
   */
  get filterIds(): number[] {
    const ids = new Set(this.#store.userLibraries.map((l) => l.id))
    if (ids.size <= 1) return []
    return this.#store.selectedLibraries.filter((id) => ids.has(id))
  }

  setUserLibraries(libraries: Pick<Library, 'id' | 'name'>[]) {
    const prev = this.#store
    const ids = libraries.map((l) => l.id)
    let selection: number[]
    if (prev.selectedLibraries.length === 0 && prev.userLibraries.length === 0) {
      // First load: start with everything selected
      selection = ids
    } else if (ids.length === 1) {
      selection = []
    } else {
      selection = prev.selectedLibraries.filter((id) => ids.includes(id))
    }
    this.#store.userLibraries = libraries.map(({ id, name }) => ({ id, name }))
    this.#store.selectedLibraries = selection
  }

  setSelected(ids: number[]) {
    this.#store.selectedLibraries = [...ids]
  }

  reset() {
    this.#store.userLibraries = []
    this.#store.selectedLibraries = []
  }
}

export const librarySelection = new LibrarySelection()
