import { signal } from '@preact/signals'

export const toastMessage = signal(null)

let timer = null

export function showToast(message, duration = 4000) {
  clearTimeout(timer)
  toastMessage.value = message
  timer = setTimeout(() => { toastMessage.value = null }, duration)
}
