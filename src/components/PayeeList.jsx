import {useState} from 'preact/hooks'
import {useSupabase} from '../hooks/useSupabase.js'
import {PayeeForm} from './PayeeForm.jsx'
import {ConfirmModal} from './ConfirmModal.jsx'
import {DeleteIcon, EditIcon} from './icons.jsx'

export function PayeeList() {
  const {data: payees, loading, insert, update, remove} = useSupabase('money_payees', {orderBy: 'name'})
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
                  <button onClick={() => setEditing(p)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><EditIcon/></button>
                  <button onClick={() => setDeleting(p.id)} class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><DeleteIcon/></button>
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
