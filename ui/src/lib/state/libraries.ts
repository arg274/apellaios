import { getOne } from '$lib/api/rest'
import { session } from '$lib/api/session'
import { librarySelection } from './library.svelte'

/** Refreshes the libraries the logged-in user may see (drives the library selector) */
export async function loadUserLibraries() {
  const id = session.userId
  if (!id) return
  try {
    const user = await getOne('user', id)
    librarySelection.setUserLibraries(user.libraries ?? [])
  } catch {
    // Keep the last known list; the selector just won't update
  }
}
