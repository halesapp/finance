import { useState } from 'preact/hooks'
import { useSupabase } from '../hooks/useSupabase.js'
import { PayeeForm } from './PayeeForm.jsx'
import { ConfirmModal } from './ConfirmModal.jsx'

export function PayeeList() {
  const { data: payees, loading, insert, update, remove } = useSupabase('payees', { orderBy: 'name' })
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleSave(payee) {
    if (editing === 'new') {
      await insert(payee)
    } else {
      await update(editing.id, payee)
    }
    setEditing(null)
  }

  async function handleDelete() {
    await remove(deleting)
    setDeleting(null)
  }

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Payees</h1>
        <button onClick={() => setEditing('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
          Add Payee
        </button>
      </div>

      {editing !== null && (
        <PayeeForm
          payee={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {payees.length === 0 ? (
        <p class="text-gray-500 dark:text-gray-400 text-sm">No payees yet.</p>
      ) : (
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Created</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {payees.map(p => (
                <tr key={p.id} class="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100">{p.name}</td>
                  <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.created_at?.slice(0, 10)}</td>
                  <td class="px-3 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(p)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/><path d="M19.5 7.125L16.862 4.487"/></svg></button>
                    <button onClick={() => setDeleting(p.id)} class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleting && (
        <ConfirmModal
          message="Delete this payee? Transactions using it will have their payee cleared."
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
