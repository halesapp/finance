import {useEffect, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'
import {DateRangeFilter} from './DateRangeFilter.jsx'
import {getRange} from '../lib/dateUtils.js'

export function BalancesPage() {
  const [range, setRange] = useState(getRange('ytd'))
  const [accountBalances, setAccountBalances] = useState([])
  const [categoryTotals, setCategoryTotals] = useState([])
  const [netWorth, setNetWorth] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBalances()
  }, [range])

  async function loadBalances() {
    setLoading(true)
    const {data: accounts} = await supabase.from('money_accounts').select('*, bank:money_banks(name)')
    const {data: txns} = await supabase.from('money_transactions').select('*')
    const {data: transfers} = await supabase.from('money_transfers').select('*')
    const {data: categories} = await supabase.from('money_categories').select('*')

    // Compute balance at range.to, working forward or backward from anchor
    const cutoff = range.to + 'Z' // make exclusive by comparing < day after
    const balances = (accounts || []).map(acct => {
      const anchor = Number(acct.initial_balance)
      const anchorDate = acct.initial_balance_date
      let bal = anchor
      for (const t of txns || []) {
        if (t.account_id !== acct.id) continue
        const amt = Number(t.amount)
        if (range.to >= anchorDate) {
          if (t.date >= anchorDate && t.date <= range.to) bal += amt
        } else {
          if (t.date > range.to && t.date < anchorDate) bal -= amt
        }
      }
      for (const tr of transfers || []) {
        let amt = 0
        if (tr.to_account_id === acct.id) amt = Number(tr.amount)
        else if (tr.from_account_id === acct.id) amt = -Number(tr.amount)
        else continue
        if (range.to >= anchorDate) {
          if (tr.date >= anchorDate && tr.date <= range.to) bal += amt
        } else {
          if (tr.date > range.to && tr.date < anchorDate) bal -= amt
        }
      }
      return {...acct, balance: bal}
    })

    setAccountBalances(balances)
    setNetWorth(balances.reduce((s, a) => s + a.balance, 0))

    // Exclude investment/retirement accounts from expense categories
    const investmentAcctIds = new Set((accounts || []).filter(a => a.account_type === 'investment' || a.account_type === 'retirement').map(a => a.id))
    const catMap = {}
    for (const t of txns || []) {
      if (investmentAcctIds.has(t.account_id)) continue
      if (t.date < range.from || t.date > range.to) continue
      if (Number(t.amount) >= 0) continue
      const cat = (categories || []).find(c => c.id === t.category_id)
      const name = cat?.name || 'Uncategorized'
      catMap[name] = (catMap[name] || 0) + Math.abs(Number(t.amount))
    }
    const sorted = Object.entries(catMap)
      .map(([name, total]) => ({name, total}))
      .sort((a, b) => b.total - a.total)
    setCategoryTotals(sorted)
    setLoading(false)
  }

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  const fmt = n => n.toLocaleString('en-US', {style: 'currency', currency: 'USD'})

  return (
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Balances</h1>
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange}/>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Net Worth</div>
        <div class={`text-3xl font-semibold font-mono mt-1 ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {fmt(netWorth)}
        </div>
      </div>

      <div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Account Balances</h2>
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Account</th>
              <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Bank</th>
              <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Balance</th>
            </tr>
            </thead>
            <tbody>
            {accountBalances.map(a => (
              <tr key={a.id} class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100">{a.name}</td>
                <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400">{a.bank?.name}</td>
                <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400">{a.account_type}</td>
                <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${a.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmt(a.balance)}
                </td>
              </tr>
            ))}
            <tr class="bg-gray-50 dark:bg-gray-900 font-medium">
              <td class="px-3 py-2 text-gray-900 dark:text-gray-100" colspan="3">Total</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {fmt(netWorth)}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      {categoryTotals.length > 0 && (
        <div>
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Expenses by Category</h2>
          <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-xs">
              <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
              </tr>
              </thead>
              <tbody>
              {categoryTotals.map(c => (
                <tr key={c.name} class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100">{c.name}</td>
                  <td class="px-3 py-1.5 text-right font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
                    {fmt(c.total)}
                  </td>
                </tr>
              ))}
              <tr class="bg-gray-50 dark:bg-gray-900 font-medium">
                <td class="px-3 py-2 text-gray-900 dark:text-gray-100">Total</td>
                <td class="px-3 py-2 text-right font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
                  {fmt(categoryTotals.reduce((s, c) => s + c.total, 0))}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
