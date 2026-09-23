export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  action?: { label: string; run: () => void }
}

class Toasts {
  items = $state<Toast[]>([])
  #next = 0

  show(
    message: string,
    kind: ToastKind = 'info',
    opts: { duration?: number; action?: Toast['action'] } = {},
  ) {
    const id = this.#next++
    this.items.push({ id, kind, message, action: opts.action })
    const duration = opts.duration ?? (kind === 'error' ? 6000 : 3500)
    if (duration > 0) setTimeout(() => this.dismiss(id), duration)
    return id
  }

  info = (message: string, opts?: { duration?: number; action?: Toast['action'] }) =>
    this.show(message, 'info', opts)
  success = (message: string, opts?: { duration?: number; action?: Toast['action'] }) =>
    this.show(message, 'success', opts)
  warning = (message: string, opts?: { duration?: number; action?: Toast['action'] }) =>
    this.show(message, 'warning', opts)
  error = (message: string, opts?: { duration?: number; action?: Toast['action'] }) =>
    this.show(message, 'error', opts)

  dismiss(id: number) {
    const i = this.items.findIndex((t) => t.id === id)
    if (i >= 0) this.items.splice(i, 1)
  }
}

export const toast = new Toasts()
