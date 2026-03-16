import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

const fmt = n => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse "YYYY-MM-DD" without timezone shift
function parseDate(s) {
  const [y, m] = s.split('-')
  return { year: parseInt(y), month: parseInt(m) - 1 }
}

export function Dashboard() {
  const [accountRows, setAccountRows] = useState([])
  const [netWorth, setNetWorth] = useState({ initial: 0, current: 0, net: 0 })
  const [monthlyData, setMonthlyData] = useState([])
  const [monthlyNet, setMonthlyNet] = useState([])
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [allTxns, setAllTxns] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedYear) computeMonthly() }, [selectedYear])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: accounts }, { data: txns }, { data: transfers }, { data: categories }] = await Promise.all([
        supabase.from('accounts').select('*, bank:banks(name)'),
        supabase.from('transactions').select('*, category:categories(id, name, parent_category_id)'),
        supabase.from('transfers').select('*'),
        supabase.from('categories').select('*'),
      ])

      setAllTxns(txns || [])
      setAllCategories(categories || [])

      // Account balances
      let totalInitial = 0, totalCurrent = 0
      const acctRows = (accounts || []).map(acct => {
        const initial = Number(acct.initial_balance)
        let bal = initial
        for (const t of txns || []) {
          if (t.account_id !== acct.id || t.date < acct.initial_balance_date) continue
          bal += Number(t.amount)
        }
        for (const tr of transfers || []) {
          if (tr.date < acct.initial_balance_date) continue
          if (tr.to_account_id === acct.id) bal += Number(tr.amount)
          if (tr.from_account_id === acct.id) bal -= Number(tr.amount)
        }
        totalInitial += initial
        totalCurrent += bal
        return { name: acct.name, initial, current: bal, net: bal - initial }
      })
      setAccountRows(acctRows)
      setNetWorth({ initial: totalInitial, current: totalCurrent, net: totalCurrent - totalInitial })

      // Find available years from transactions
      const years = new Set()
      for (const t of txns || []) {
        years.add(parseDate(t.date).year)
      }
      const sorted = [...years].sort((a, b) => b - a)
      setAvailableYears(sorted)
      setSelectedYear(sorted[0] || new Date().getFullYear())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  function computeMonthly() {
    const catById = Object.fromEntries(allCategories.map(c => [c.id, c]))
    const parentGroups = allCategories.filter(c => !c.parent_category_id).map(c => c.name).sort()

    const grid = {}
    for (const g of parentGroups) grid[g] = new Array(12).fill(0)
    grid['Uncategorized'] = new Array(12).fill(0)

    for (const t of allTxns) {
      const { year, month } = parseDate(t.date)
      if (year !== selectedYear) continue
      const amt = Number(t.amount)
      let group = 'Uncategorized'
      if (t.category?.parent_category_id) {
        group = catById[t.category.parent_category_id]?.name || 'Uncategorized'
      } else if (t.category?.id) {
        group = t.category.name
      }
      if (!grid[group]) grid[group] = new Array(12).fill(0)
      grid[group][month] += amt
    }

    const rows = Object.entries(grid)
      .map(([name, months]) => ({ name, months, annual: months.reduce((s, v) => s + v, 0) }))
      .sort((a, b) => a.name.localeCompare(b.name))
    setMonthlyData(rows)

    const netPerMonth = new Array(12).fill(0)
    for (const r of rows) {
      for (let i = 0; i < 12; i++) netPerMonth[i] += r.months[i]
    }
    setMonthlyNet(netPerMonth)
  }

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  const colorClass = n => Number(n) < 0 ? 'text-red-600 dark:text-red-400' : Number(n) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'

  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Overview</h1>

      {/* Account balances */}
      <div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Account Balances</h2>
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Account</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Initial</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Current</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Net</th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map(a => (
                <tr key={a.name} class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100">{a.name}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(a.initial)}`}>{fmt(a.initial)}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(a.current)}`}>{fmt(a.current)}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(a.net)}`}>{fmt(a.net)}</td>
                </tr>
              ))}
              <tr class="bg-gray-50 dark:bg-gray-900 font-medium">
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100">Net Worth</td>
                <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(netWorth.initial)}`}>{fmt(netWorth.initial)}</td>
                <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(netWorth.current)}`}>{fmt(netWorth.current)}</td>
                <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(netWorth.net)}`}>{fmt(netWorth.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly by category group */}
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Monthly by Category</h2>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-900">Category</th>
                {MONTHS.map(m => (
                  <th key={m} class="text-right px-2 py-2 font-medium text-gray-500 dark:text-gray-400">{m}</th>
                ))}
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Annual</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(r => (
                <tr key={r.name} class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800">{r.name}</td>
                  {r.months.map((v, i) => (
                    <td key={i} class={`px-2 py-1.5 text-right font-mono whitespace-nowrap ${v === 0 ? 'text-gray-300 dark:text-gray-600' : colorClass(v)}`}>
                      {v === 0 ? '—' : fmt(v)}
                    </td>
                  ))}
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap font-medium ${colorClass(r.annual)}`}>
                    {r.annual === 0 ? '—' : fmt(r.annual)}
                  </td>
                </tr>
              ))}
              <tr class="bg-gray-50 dark:bg-gray-900 font-medium">
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-900">Net</td>
                {monthlyNet.map((v, i) => (
                  <td key={i} class={`px-2 py-2 text-right font-mono whitespace-nowrap ${colorClass(v)}`}>
                    {v === 0 ? '—' : fmt(v)}
                  </td>
                ))}
                <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(monthlyNet.reduce((s, v) => s + v, 0))}`}>
                  {fmt(monthlyNet.reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
