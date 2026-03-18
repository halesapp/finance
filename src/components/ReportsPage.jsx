import {useEffect, useMemo, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'

const fmt = n => Number(n).toLocaleString('en-US', {style: 'currency', currency: 'USD'})
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const selectClass = 'px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
const inputClass = 'px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'

export function ReportsPage() {
  const [txns, setTxns] = useState([])
  const [accounts, setAccounts] = useState([])
  const [payees, setPayees] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [accountId, setAccountId] = useState('')
  const [payeeId, setPayeeId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [groupBy, setGroupBy] = useState('month') // month | payee | category

  useEffect(() => {
    Promise.all([
      supabase.from('transactions').select('*, account:accounts(name), payee:payees(name), category:categories(id, name, parent_category_id)').order('date'),
      supabase.from('accounts').select('id, name, is_closed, account_type').order('name'),
      supabase.from('payees').select('id, name').order('name'),
      supabase.from('categories').select('id, name, parent_category_id').order('name'),
    ]).then(([{data: t}, {data: a}, {data: p}, {data: c}]) => {
      setTxns(t || [])
      setAccounts(a || [])
      setPayees(p || [])
      setCategories(c || [])
      setLoading(false)
    })
  }, [])

  // Build category tree for dropdown
  const categoryTree = useMemo(() => {
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
      opts.push({id: r.id, label: r.name, depth: 0})
      for (const child of r.children) {
        opts.push({id: child.id, label: child.name, depth: 1})
      }
    }
    return opts
  }, [categories])

  // Investment/retirement account IDs to exclude from reports
  const investmentAccountIds = useMemo(() => {
    return new Set(accounts.filter(a => a.account_type === 'investment' || a.account_type === 'retirement').map(a => a.id))
  }, [accounts])

  // Filter transactions (exclude investment/retirement unless specifically selected)
  const filtered = useMemo(() => {
    return txns.filter(t => {
      if (t.date < dateFrom || t.date > dateTo) return false
      if (accountId) {
        if (t.account_id !== accountId) return false
      } else {
        // When "All accounts" is selected, exclude investment/retirement
        if (investmentAccountIds.has(t.account_id)) return false
      }
      if (payeeId && t.payee_id !== payeeId) return false
      if (categoryId) {
        // Match category or its children
        if (t.category_id !== categoryId) {
          const cat = categories.find(c => c.id === t.category_id)
          if (!cat || cat.parent_category_id !== categoryId) return false
        }
      }
      return true
    })
  }, [txns, accountId, payeeId, categoryId, dateFrom, dateTo, categories, investmentAccountIds])

  // Monthly aggregation for chart
  const monthlyData = useMemo(() => {
    const map = {}
    for (const t of filtered) {
      const key = t.date.slice(0, 7) // YYYY-MM
      if (!map[key]) map[key] = {month: key, income: 0, expense: 0, net: 0}
      const amt = Number(t.amount)
      if (amt >= 0) map[key].income += amt
      else map[key].expense += amt
      map[key].net += amt
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  }, [filtered])

  // Group-by aggregation for summary table
  const summaryRows = useMemo(() => {
    const map = {}
    for (const t of filtered) {
      let key, label
      if (groupBy === 'month') {
        key = t.date.slice(0, 7)
        const [y, m] = key.split('-')
        label = `${MONTHS[parseInt(m) - 1]} ${y}`
      } else if (groupBy === 'payee') {
        key = t.payee_id || 'none'
        label = t.payee?.name || 'Unknown'
      } else {
        key = t.category_id || 'none'
        label = t.category?.name || 'Uncategorized'
      }
      if (!map[key]) map[key] = {key, label, income: 0, expense: 0, net: 0, count: 0}
      const amt = Number(t.amount)
      if (amt >= 0) map[key].income += amt
      else map[key].expense += amt
      map[key].net += amt
      map[key].count++
    }
    const rows = Object.values(map)
    if (groupBy === 'month') rows.sort((a, b) => a.key.localeCompare(b.key))
    else rows.sort((a, b) => a.net - b.net)
    return rows
  }, [filtered, groupBy])

  const totals = useMemo(() => {
    let income = 0, expense = 0
    for (const r of summaryRows) {
      income += r.income
      expense += r.expense
    }
    return {income, expense, net: income + expense, count: filtered.length}
  }, [summaryRows, filtered])

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  const colorClass = n => Number(n) < 0 ? 'text-red-600 dark:text-red-400' : Number(n) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'

  return (
    <div class="space-y-5">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Reports</h1>

      {/* Filter bar */}
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">From</label>
            <input type="date" value={dateFrom} onInput={e => setDateFrom(e.target.value)} class={`${inputClass} w-full`}/>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">To</label>
            <input type="date" value={dateTo} onInput={e => setDateTo(e.target.value)} class={`${inputClass} w-full`}/>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} class={`${selectClass} w-full`}>
              <option value="">All accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Payee</label>
            <select value={payeeId} onChange={e => setPayeeId(e.target.value)} class={`${selectClass} w-full`}>
              <option value="">All payees</option>
              {payees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} class={`${selectClass} w-full`}>
              <option value="">All categories</option>
              {categoryTree.map(c => (
                <option key={c.id} value={c.id}>{c.depth > 0 ? '\u00A0\u00A0\u00A0\u00A0' + c.label : c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Group by</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} class={`${selectClass} w-full`}>
              <option value="month">Month</option>
              <option value="payee">Payee</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label: 'Transactions', value: totals.count, isCurrency: false},
          {label: 'Income', value: totals.income, cls: 'text-green-600 dark:text-green-400'},
          {label: 'Expenses', value: totals.expense, cls: 'text-red-600 dark:text-red-400'},
          {label: 'Net', value: totals.net, cls: colorClass(totals.net)},
        ].map(s => (
          <div key={s.label} class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</div>
            <div class={`text-lg font-semibold font-mono mt-0.5 ${s.cls || 'text-gray-900 dark:text-gray-100'}`}>
              {s.isCurrency === false ? s.value : fmt(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      {monthlyData.length > 1 && <LineChart data={monthlyData}/>}

      {/* Summary table */}
      <div>
        <h2 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Summary by {groupBy === 'month' ? 'Month' : groupBy === 'payee' ? 'Payee' : 'Category'}
        </h2>
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">{groupBy === 'month' ? 'Month' : groupBy === 'payee' ? 'Payee' : 'Category'}</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Count</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Income</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Expenses</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Net</th>
            </tr>
            </thead>
            <tbody>
            {summaryRows.map(r => (
              <tr key={r.key} class="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 whitespace-nowrap">{r.label}</td>
                <td class="px-3 py-1.5 text-right text-gray-600 dark:text-gray-400">{r.count}</td>
                <td class="px-3 py-1.5 text-right font-mono text-green-600 dark:text-green-400 whitespace-nowrap">{r.income > 0 ? fmt(r.income) : '—'}</td>
                <td class="px-3 py-1.5 text-right font-mono text-red-600 dark:text-red-400 whitespace-nowrap">{r.expense < 0 ? fmt(r.expense) : '—'}</td>
                <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(r.net)}`}>{fmt(r.net)}</td>
              </tr>
            ))}
            <tr class="bg-gray-50 dark:bg-gray-900 font-medium">
              <td class="px-3 py-2 text-gray-900 dark:text-gray-100">Total</td>
              <td class="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{totals.count}</td>
              <td class="px-3 py-2 text-right font-mono text-green-600 dark:text-green-400 whitespace-nowrap">{fmt(totals.income)}</td>
              <td class="px-3 py-2 text-right font-mono text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(totals.expense)}</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(totals.net)}`}>{fmt(totals.net)}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function LineChart({data}) {
  const W = 720, H = 200, PAD = {top: 16, right: 16, bottom: 28, left: 64}
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom

  const allVals = data.flatMap(d => [d.income, d.expense, d.net])
  const maxVal = Math.max(...allVals, 0)
  const minVal = Math.min(...allVals, 0)
  const range = maxVal - minVal || 1

  const x = i => PAD.left + (i / (data.length - 1)) * cw
  const y = v => PAD.top + ch - ((v - minVal) / range) * ch

  const makePath = (key) => {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  }

  const zeroY = y(0)

  // Grid lines
  const gridLines = 5
  const gridVals = Array.from({length: gridLines}, (_, i) => minVal + (range / (gridLines - 1)) * i)

  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div class="flex items-center gap-4 mb-2">
        <h2 class="text-sm font-medium text-gray-900 dark:text-gray-100">Monthly Trend</h2>
        <div class="flex gap-3 text-[10px]">
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-green-500 inline-block rounded"></span> Income</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-red-500 inline-block rounded"></span> Expenses</span>
          <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-blue-500 inline-block rounded"></span> Net</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} class="w-full" style={{maxHeight: '220px'}}>
        {/* Grid */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)}
                  stroke="currentColor" class="text-gray-200 dark:text-gray-700" stroke-width="0.5"/>
            <text x={PAD.left - 6} y={y(v) + 3} text-anchor="end"
                  class="text-gray-400 dark:text-gray-500" font-size="9" fill="currentColor">
              {v >= 1000 || v <= -1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`}
            </text>
          </g>
        ))}

        {/* Zero line */}
        {minVal < 0 && maxVal > 0 && (
          <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY}
                stroke="currentColor" class="text-gray-400 dark:text-gray-500" stroke-width="0.5" stroke-dasharray="4 2"/>
        )}

        {/* Lines */}
        <path d={makePath('income')} fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d={makePath('expense')} fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d={makePath('net')} fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

        {/* Dots */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.income)} r="2.5" fill="#22c55e"/>
            <circle cx={x(i)} cy={y(d.expense)} r="2.5" fill="#ef4444"/>
            <circle cx={x(i)} cy={y(d.net)} r="2.5" fill="#3b82f6"/>
          </g>
        ))}

        {/* X labels */}
        {data.map((d, i) => {
          const [yr, mo] = d.month.split('-')
          const label = `${MONTHS[parseInt(mo) - 1]} ${yr.slice(2)}`
          // Skip labels if too many
          const skip = data.length > 12 ? Math.ceil(data.length / 12) : 1
          if (i % skip !== 0 && i !== data.length - 1) return null
          return (
            <text key={i} x={x(i)} y={H - 4} text-anchor="middle"
                  class="text-gray-400 dark:text-gray-500" font-size="9" fill="currentColor">
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
