import {useCallback, useEffect, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'
import {TransactionForm} from './TransactionForm.jsx'
import {ConfirmModal} from './ConfirmModal.jsx'
import {DeleteIcon, EditIcon, TransferIcon} from './icons.jsx'

const PAGE_SIZE = 50
const fmt = n => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export function TransactionList() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [converting, setConverting] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchTxns = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, account:accounts(name), category:categories(name), payee:payees(name)')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    setTxns(data || [])
    setHasMore((data || []).length === PAGE_SIZE)
    setLoading(false)
  }, [page])

  useEffect(() => { fetchTxns() }, [fetchTxns])

  useEffect(() => {
    supabase.from('accounts').select('id, name').order('name').then(({data}) => setAccounts(data || []))
  }, [])

  async function handleSave(txn) {
    if (editing === 'new') {
      const { error } = await supabase.from('transactions').insert(txn)
      if (error) throw error
    } else {
      const { error } = await supabase.from('transactions').update(txn).eq('id', editing.id)
      if (error) throw error
    }
    setEditing(null)
    fetchTxns()
  }

  async function handleDelete() {
    await supabase.from('transactions').delete().eq('id', deleting)
    setDeleting(null)
    fetchTxns()
  }

  async function handleConvertToTransfer(targetAccountId) {
    const txn = converting
    const amt = Math.abs(Number(txn.amount))
    const isOutgoing = Number(txn.amount) < 0
    const transfer = {
      date: txn.date,
      from_account_id: isOutgoing ? txn.account_id : targetAccountId,
      to_account_id: isOutgoing ? targetAccountId : txn.account_id,
      amount: amt,
      description: txn.description || null,
    }
    const {error: insertErr} = await supabase.from('transfers').insert(transfer)
    if (insertErr) throw insertErr
    await supabase.from('transactions').delete().eq('id', txn.id)
    setConverting(null)
    fetchTxns()
  }

  if (editing !== null) {
    return (
      <div class="space-y-3">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {editing === 'new' ? 'New Transaction' : 'Edit Transaction'}
        </h1>
        <TransactionForm
          transaction={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </div>
    )
  }

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Transactions</h1>
        <button onClick={() => setEditing('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
          Add Transaction
        </button>
      </div>

      {loading ? (
        <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>
      ) : txns.length === 0 ? (
        <div class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400 text-sm">No transactions yet.</p>
          <button onClick={() => setEditing('new')}
            class="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Add your first transaction
          </button>
        </div>
      ) : (
        <>
          <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Payee</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Account</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 last:border-0">
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.date}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.payee?.name || '—'}</td>
                    <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 max-w-xs truncate">{t.description || '—'}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.account?.name}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.category?.name || '—'}</td>
                    <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${
                      Number(t.amount) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {fmt(t.amount)}
                    </td>
                    <td class="px-3 py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => setConverting(t)} class="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 mr-2" title="Convert to transfer">
                        <TransferIcon/>
                      </button>
                      <button onClick={() => setEditing(t)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><EditIcon/></button>
                      <button onClick={() => setDeleting(t.id)} class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><DeleteIcon/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="flex justify-between">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300">Prev</button>
            <span class="text-xs text-gray-500 dark:text-gray-400 self-center">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}
              class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 text-gray-700 dark:text-gray-300">Next</button>
          </div>
        </>
      )}

      {deleting && (
        <ConfirmModal
          message="Delete this transaction?"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {converting && (
        <ConvertToTransferModal
          transaction={converting}
          accounts={accounts}
          onConfirm={handleConvertToTransfer}
          onCancel={() => setConverting(null)}
        />
      )}
    </div>
  )
}

function ConvertToTransferModal({transaction, accounts, onConfirm, onCancel}) {
  const [targetId, setTargetId] = useState('')
  const isOutgoing = Number(transaction.amount) < 0
  const otherAccounts = accounts.filter(a => a.id !== transaction.account_id)

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 class="font-medium text-gray-900 dark:text-gray-100">Convert to Transfer</h3>
        <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p><span class="font-medium">{transaction.date}</span> &middot; {fmt(transaction.amount)}</p>
          <p>{transaction.description || transaction.payee?.name || ''}</p>
          <p>{isOutgoing ? 'From' : 'To'}: <span class="font-medium">{transaction.account?.name}</span></p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {isOutgoing ? 'Transfer to' : 'Transfer from'}
          </label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select account...</option>
            {otherAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div class="flex gap-2">
          <button onClick={() => onConfirm(targetId)} disabled={!targetId}
                  class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg disabled:opacity-50">
            Convert
          </button>
          <button onClick={onCancel}
                  class="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
