import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function AccountForm({ account, onSave, onCancel }) {
  const [name, setName] = useState(account?.name || '')
  const [bankId, setBankId] = useState(account?.bank_id || '')
  const [initialBalance, setInitialBalance] = useState(account?.initial_balance ?? '0')
  const [initialBalanceDate, setInitialBalanceDate] = useState(account?.initial_balance_date || new Date().toISOString().slice(0, 10))
  const [accountType, setAccountType] = useState(account?.account_type || 'checking')
  const [banks, setBanks] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('banks').select('id, name').order('name').then(({ data }) => {
      setBanks(data || [])
      if (!bankId && data?.length) setBankId(data[0].id)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    if (!bankId) return setError('Select a bank')
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        bank_id: bankId,
        initial_balance: Number(initialBalance),
        initial_balance_date: initialBalanceDate,
        account_type: accountType,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const types = ['checking', 'savings', 'credit', 'investment', 'cash', 'other']

  return (
    <form onSubmit={handleSubmit} class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h3 class="font-medium text-gray-900 dark:text-gray-100">{account ? 'Edit Account' : 'New Account'}</h3>
      {error && <p class="text-red-600 text-sm">{error}</p>}
      <input type="text" placeholder="Account name" value={name} onInput={e => setName(e.target.value)}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <select value={bankId} onChange={e => setBankId(e.target.value)}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select value={accountType} onChange={e => setAccountType(e.target.value)}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
      </select>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">Initial Balance</label>
          <input type="number" step="0.01" value={initialBalance} onInput={e => setInitialBalance(e.target.value)}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">As of Date</label>
          <input type="date" value={initialBalanceDate} onInput={e => setInitialBalanceDate(e.target.value)}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
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
