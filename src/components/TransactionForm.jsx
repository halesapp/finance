import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function TransactionForm({ transaction, onSave, onCancel }) {
  const [accountId, setAccountId] = useState(transaction?.account_id || '')
  const [amount, setAmount] = useState(transaction?.amount ?? '')
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState(transaction?.description || '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '')
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('accounts').select('id, name, is_closed').order('name').then(({ data }) => {
      const open = (data || []).filter(a => !a.is_closed)
      setAccounts(open)
      if (!accountId && open.length) setAccountId(open[0].id)
    })
    supabase.from('categories').select('id, name').order('name').then(({ data }) => {
      setCategories(data || [])
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!accountId) return setError('Select an account')
    if (!amount || Number(amount) === 0) return setError('Amount cannot be zero')
    setSaving(true)
    try {
      await onSave({
        account_id: accountId,
        amount: Number(amount),
        date,
        description: description.trim(),
        category_id: categoryId || null,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h3 class="font-medium text-gray-900 dark:text-gray-100">{transaction ? 'Edit Transaction' : 'New Transaction'}</h3>
      {error && <p class="text-red-600 text-sm">{error}</p>}
      <div class="grid grid-cols-2 gap-3">
        <select value={accountId} onChange={e => setAccountId(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Amount (negative for expense)" value={amount} onInput={e => setAmount(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <input type="date" value={date} onInput={e => setDate(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">No category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <input type="text" placeholder="Description" value={description} onInput={e => setDescription(e.target.value)}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div class="flex gap-2">
        <button type="submit" disabled={saving} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} class="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
          Cancel
        </button>
      </div>
    </form>
  )
}
