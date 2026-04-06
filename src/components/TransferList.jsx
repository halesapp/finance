import {useCallback, useEffect, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'
import {TransferForm} from './TransferForm.jsx'
import {ConfirmModal} from './ConfirmModal.jsx'
import {DeleteIcon, EditIcon} from './icons.jsx'

const PAGE_SIZE = 50
const fmt = n => Number(n).toLocaleString('en-US', {style: 'currency', currency: 'USD'})

export function TransferList() {
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchTransfers = useCallback(async () => {
    setLoading(true)
    const {data} = await supabase
      .from('money_transfers')
      .select('*, from_account:money_accounts!money_transfers_from_account_id_fkey(name), to_account:money_accounts!money_transfers_to_account_id_fkey(name)')
      .order('date', {ascending: false})
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    setTransfers(data || [])
    setHasMore((data || []).length === PAGE_SIZE)
    setLoading(false)
  }, [page])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  async function handleSave(transfer) {
    if (editing === 'new') {
      const {error} = await supabase.from('money_transfers').insert(transfer)
      if (error) throw error
    } else {
      const {error} = await supabase.from('money_transfers').update(transfer).eq('id', editing.id)
      if (error) throw error
    }
    setEditing(null)
    fetchTransfers()
  }

  async function handleDelete() {
    await supabase.from('money_transfers').delete().eq('id', deleting)
    setDeleting(null)
    fetchTransfers()
  }

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Transfers</h1>
        <button onClick={() => setEditing('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
          Add Transfer
        </button>
      </div>

      {editing !== null && (
        <TransferForm
          transfer={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>
      ) : transfers.length === 0 ? (
        <div class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400 text-sm">No transfers yet.</p>
          <button onClick={() => setEditing('new')}
                  class="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Add your first transfer
          </button>
        </div>
      ) : (
        <>
          <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-xs">
              <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">From</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">To</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-16"></th>
              </tr>
              </thead>
              <tbody>
              {transfers.map(t => (
                <tr key={t.id}
                    class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 last:border-0">
                  <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.date}</td>
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 whitespace-nowrap">{t.from_account?.name}</td>
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 whitespace-nowrap">{t.to_account?.name}</td>
                  <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 max-w-xs truncate">{t.description || '—'}</td>
                  <td class="px-3 py-1.5 text-right font-mono whitespace-nowrap text-green-600 dark:text-green-400">
                    {fmt(t.amount)}
                  </td>
                  <td class="px-3 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(t)}
                            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit">
                      <EditIcon/>
                    </button>
                    <button onClick={() => setDeleting(t.id)}
                            class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete">
                      <DeleteIcon/>
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
          <div class="flex justify-between">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300">Prev
            </button>
            <span class="text-xs text-gray-500 dark:text-gray-400 self-center">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}
                    class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300">Next
            </button>
          </div>
        </>
      )}

      {deleting && (
        <ConfirmModal
          message="Delete this transfer?"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
