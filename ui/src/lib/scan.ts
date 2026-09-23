import { startScan } from '$lib/api/subsonic'
import { t } from '$lib/i18n/index.svelte'
import { toast } from '$lib/state/toast.svelte'

/**
 * Starts a quick or full scan, of every library or only `libraryIds`. Progress arrives through
 * the activity event stream, so this only reports whether the scan was accepted.
 */
export async function scanLibraries(
  fullScan: boolean,
  libraryIds?: (string | number)[],
): Promise<boolean> {
  try {
    // "<id>:" targets a whole library; a folder path could follow the colon
    await startScan({
      fullScan,
      ...(libraryIds?.length && { target: libraryIds.map((id) => `${id}:`) }),
    })
    toast.success(
      t(
        fullScan
          ? 'resources.library.notifications.fullScanStarted'
          : 'resources.library.notifications.quickScanStarted',
      ),
    )
    return true
  } catch {
    toast.warning(t('resources.library.notifications.scanError'))
    return false
  }
}
