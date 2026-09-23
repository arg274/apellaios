import type { Attachment } from 'svelte/attachments'

/**
 * Calls `onEnter` once, when the element comes within `margin` of being visible. Pages scroll
 * inside <main> rather than the window, so that is the root: against the viewport, content below
 * the fold is clipped by <main> and a margin would never let it load early.
 */
export const inView =
  (onEnter: () => void, margin = '300px'): Attachment<HTMLElement> =>
  (el) => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect()
          onEnter()
        }
      },
      { root: el.closest('main'), rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }
