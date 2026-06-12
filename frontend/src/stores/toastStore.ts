import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  link?: string
  linkText?: string
}

interface ToastState {
  toasts: Toast[]
  add: (msg: string, link?: string, linkText?: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, link, linkText) => {
    const id = Date.now().toString(36)
    set((s) => ({ toasts: [...s.toasts, { id, message, link, linkText }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 8000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
