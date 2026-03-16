import { toastMessage } from '../lib/toast.js'

export function Toast() {
  if (!toastMessage.value) return null
  return (
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-red-600 text-white text-sm rounded-lg shadow-lg max-w-sm text-center">
      {toastMessage.value}
    </div>
  )
}
