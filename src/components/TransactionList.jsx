import { useState, useEffect, useCallback } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { TransactionForm } from './TransactionForm.jsx'
import { ConfirmModal } from './ConfirmModal.jsx'

const PAGE_SIZE = 50

export function TransactionList() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Filters
  const [filterAccount, setFilterAccount] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => setAccounts(data || []))
    supabase.from('categories').select('id, name').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  const fetchTxns = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('transactions')
      .select('*, account:accounts(name), category:categories(name)')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filterAccount) query = query.eq('account_id', filterAccount)
    if (filterCategory) query = query.eq('category_id', filterCategory)
    if (filterFrom) query = query.gte('date', filterFrom)
    if (filterTo) query = query.lte('date', filterTo)
    if (filterSearch) query = query.ilike('description', `%${filterSearch}%`)

    const { data } = await query
    setTxns(data || [])
    setHasMore((data || []).length === PAGE_SIZE)
    setLoading(false)
  }, [page, filterAccount, filterCategory, filterFrom, filterTo, filterSearch])

  useEffect(() => { fetchTxns() }, [fetchTxns])

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

  const inputClass = 'px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Transactions</h1>
        <button onClick={() => setEditing('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-2">
        <input type="text" placeholder="Search..." value={filterSearch} onInput={e => { setFilterSearch(e.target.value); setPage(0) }}
          class={inputClass} />
        <select value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(0) }}
          class={inputClass}>
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(0) }}
          class={inputClass}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={filterFrom} onInput={e => { setFilterFrom(e.target.value); setPage(0) }}
          class={inputClass} />
        <input type="date" value={filterTo} onInput={e => { setFilterTo(e.target.value); setPage(0) }}
          class={inputClass} />
      </div>

      {editing !== null && (
        <TransactionForm
          transaction={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>
      ) : txns.length === 0 ? (
        <p class="text-gray-500 dark:text-gray-400 text-sm">No transactions found.</p>
      ) : (
        <>
          <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Account</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id}
                    class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 last:border-0">
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.date}</td>
                    <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 max-w-xs truncate">{t.description || '—'}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.account?.name}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.category?.name || '—'}</td>
                    <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${
                      Number(t.amount) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {Number(t.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                    <td class="px-3 py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(t)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/><path d="M19.5 7.125L16.862 4.487"/></svg></button>
                      <button onClick={() => setDeleting(t.id)} class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>
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
    </div>
  )
}
