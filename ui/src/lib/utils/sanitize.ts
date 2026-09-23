import DOMPurify from 'dompurify'

// Links that open a new tab must not hand the linked page a handle on this window
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * Sanitises HTML from outside the app (artist bios, album notes, the admin's login message) for
 * rendering with {@html}. `target` is kept so bio links can open in a new tab.
 */
export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
