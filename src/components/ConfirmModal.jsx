export function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg p-5 max-w-sm mx-4"
        onClick={e => e.stopPropagation()}>
        <p class="text-sm text-gray-900 dark:text-gray-100 mb-4">{message}</p>
        <div class="flex justify-end gap-2">
          <button onClick={onCancel}
            class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={onConfirm}
            class="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
