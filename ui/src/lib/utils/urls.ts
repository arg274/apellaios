import config from '$lib/config'

/** Prefixes a server path with the configured BasePath */
export const baseUrl = (path: string): string => {
  const base = config.baseURL || ''
  return [base, path.replace(/^\//, '')].join('/')
}

export const shareUrl = (path: string): string => {
  if (config.shareURL !== '') {
    return [config.shareURL || '', path.replace(/^\//, '')].join('/')
  }
  return baseUrl(path)
}

export const sharePlayerUrl = (id: string): string =>
  new URL(shareUrl(config.publicBaseUrl + '/' + id), window.location.href).href

export const shareStreamUrl = (id: string): string => shareUrl(config.publicBaseUrl + '/s/' + id)

export const shareDownloadUrl = (id: string): string => shareUrl(config.publicBaseUrl + '/d/' + id)

export const shareCoverUrl = (id: string, square?: boolean): string =>
  shareUrl(config.publicBaseUrl + '/img/' + id + '?size=300' + (square ? '&square=true' : ''))

export const docsUrl = (path: string): string => `https://www.navidrome.org${path}`

export const isLastFmURL = (url: string | null | undefined): boolean => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'last.fm' || parsed.hostname.endsWith('.last.fm')) &&
      parsed.pathname.startsWith('/music/')
    )
  } catch {
    return false
  }
}

/**
 * The URL if it's a web link, otherwise undefined. Stored URLs (radio home pages, plugin
 * manifests) may only become an href or be opened when they are http(s): a `javascript:` or
 * `data:` URL would run in this origin, with the user's session.
 */
export const externalUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

export const openInNewTab = (url: string): Window | null => {
  const win = window.open(url, '_blank', 'noopener')
  win?.focus()
  return win
}
