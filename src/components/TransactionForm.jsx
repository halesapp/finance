import {useEffect, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

export function TransactionForm({transaction, onSave, onCancel}) {
  const existingAmt = transaction ? Number(transaction.amount) : null
  const [accountId, setAccountId] = useState(transaction?.account_id || '')
  const [amount, setAmount] = useState(existingAmt != null ? Math.abs(existingAmt).toString() : '')
  const [isExpense, setIsExpense] = useState(existingAmt != null ? existingAmt < 0 : true)
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState(transaction?.description || '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '')
  const [payeeId, setPayeeId] = useState(transaction?.payee_id || '')
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [payees, setPayees] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('accounts').select('id, name, is_closed').order('name').then(({data}) => {
      const open = (data || []).filter(a => !a.is_closed)
      setAccounts(open)
      if (!accountId && open.length) setAccountId(open[0].id)
    })
    supabase.from('categories').select('id, name, parent_category_id').order('name').then(({data}) => {
      setCategories(data || [])
    })
    supabase.from('payees').select('id, name').order('name').then(({data}) => {
      setPayees(data || [])
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!payeeId) return setError('Select a payee')
    if (!accountId) return setError('Select an account')
    const num = Number(amount)
    if (!amount || num === 0) return setError('Amount cannot be zero')
    if (num < 0) return setError('Enter a positive number and use the Expense/Income toggle')
    setSaving(true)
    try {
      await onSave({
        account_id: accountId,
        payee_id: payeeId,
        amount: isExpense ? -num : num,
        date,
        description: description.trim(),
        category_id: categoryId || null,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const toggleBtn = (label, active) => (
    <button type="button" onClick={() => setIsExpense(label === 'Expense')}
            class={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              active
                ? label === 'Expense'
                  ? 'bg-red-600 text-white'
                  : 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
      {label}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      {error && <p class="text-red-600 text-sm">{error}</p>}

      <div class="flex gap-2">
        {toggleBtn('Expense', isExpense)}
        {toggleBtn('Income', !isExpense)}
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
        <input type="number" step="0.01" min="0" placeholder="0.00" value={amount}
               onInput={e => setAmount(e.target.value)} class={inputClass}/>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
        <input type="text" placeholder="What was this for?" value={description}
               onInput={e => setDescription(e.target.value)} class={inputClass}/>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payee</label>
        <select value={payeeId} onChange={e => setPayeeId(e.target.value)} class={inputClass}>
          <option value="">Select a payee</option>
          {payees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Account</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} class={inputClass}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} class={inputClass}>
          <option value="">No category</option>
          {(() => {
            const byId = Object.fromEntries(categories.map(c => [c.id, {...c, children: []}]))
            const roots = []
            for (const c of Object.values(byId)) {
              if (c.parent_category_id && byId[c.parent_category_id]) {
                byId[c.parent_category_id].children.push(c)
              } else {
                roots.push(c)
              }
            }
            const opts = []
            for (const r of roots) {
              opts.push(<option key={r.id} value={r.id}>{r.name}</option>)
              for (const child of r.children) {
                opts.push(<option key={child.id} value={child.id}>{'\u00A0\u00A0\u00A0\u00A0' + child.name}</option>)
              }
            }
            return opts
          })()}
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
        <input type="date" value={date} onInput={e => setDate(e.target.value)} class={inputClass}/>
      </div>

      <div class="flex gap-2 pt-2">
        <button type="submit" disabled={saving}
                class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
                class="flex-1 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
          Cancel
        </button>
      </div>
    </form>
  )
}
