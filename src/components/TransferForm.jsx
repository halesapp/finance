import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function TransferForm({ transfer, onSave, onCancel }) {
  const [fromAccountId, setFromAccountId] = useState(transfer?.from_account_id || '')
  const [toAccountId, setToAccountId] = useState(transfer?.to_account_id || '')
  const [amount, setAmount] = useState(transfer?.amount ?? '')
  const [date, setDate] = useState(transfer?.date || new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState(transfer?.description || '')
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('accounts').select('id, name, is_closed').order('name').then(({ data }) => {
      const open = (data || []).filter(a => !a.is_closed)
      setAccounts(open)
      if (!fromAccountId && open.length >= 2) {
        setFromAccountId(open[0].id)
        setToAccountId(open[1].id)
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) return setError('Select both accounts')
    if (fromAccountId === toAccountId) return setError('Accounts must be different')
    if (!amount || Number(amount) <= 0) return setError('Amount must be positive')
    setSaving(true)
    try {
      await onSave({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: Number(amount),
        date,
        description: description.trim(),
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h3 class="font-medium text-gray-900 dark:text-gray-100">{transfer ? 'Edit Transfer' : 'New Transfer'}</h3>
      {error && <p class="text-red-600 text-sm">{error}</p>}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">From</label>
          <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">To</label>
          <select value={toAccountId} onChange={e => setToAccountId(e.target.value)}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select...</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <input type="number" step="0.01" min="0" placeholder="Amount" value={amount} onInput={e => setAmount(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={date} onInput={e => setDate(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <input type="text" placeholder="Description (optional)" value={description} onInput={e => setDescription(e.target.value)}
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
