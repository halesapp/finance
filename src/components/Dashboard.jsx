import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { currentPage } from '../lib/state.js'

export function Dashboard() {
  const [stats, setStats] = useState({ netWorth: 0, monthExpenses: 0, monthIncome: 0, recentTxns: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      const { data: accounts } = await supabase.from('accounts').select('*, bank:banks(name)')
      const { data: allTxns } = await supabase.from('transactions').select('*')
      const { data: allTransfers } = await supabase.from('transfers').select('*')

      let netWorth = 0
      for (const acct of accounts || []) {
        let bal = Number(acct.initial_balance)
        for (const t of allTxns || []) {
          if (t.account_id !== acct.id) continue
          if (t.date < acct.initial_balance_date) continue
          bal += Number(t.amount)
        }
        for (const tr of allTransfers || []) {
          if (tr.date < acct.initial_balance_date) continue
          if (tr.to_account_id === acct.id) bal += Number(tr.amount)
          if (tr.from_account_id === acct.id) bal -= Number(tr.amount)
        }
        netWorth += bal
      }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const monthTxns = (allTxns || []).filter(t => t.date >= monthStart)
      const monthExpenses = monthTxns.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      const monthIncome = monthTxns.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)

      const { data: recent } = await supabase
        .from('transactions')
        .select('*, account:accounts(name), category:categories(name)')
        .order('date', { ascending: false })
        .limit(15)

      setStats({ netWorth, monthExpenses, monthIncome, recentTxns: recent || [] })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Net Worth" value={fmt(stats.netWorth)} color={stats.netWorth >= 0 ? 'green' : 'red'} />
        <Card label="Income (MTD)" value={fmt(stats.monthIncome)} color="green" />
        <Card label="Expenses (MTD)" value={fmt(stats.monthExpenses)} color="red" />
      </div>

      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Transactions</h2>
          <button
            onClick={() => currentPage.value = 'transactions'}
            class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >View all</button>
        </div>
        {stats.recentTxns.length === 0 ? (
          <p class="text-gray-500 dark:text-gray-400 text-sm">No transactions yet.</p>
        ) : (
          <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Account</th>
                  <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTxns.map(t => (
                  <tr key={t.id} class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.date}</td>
                    <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 max-w-xs truncate">{t.description || '—'}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.account?.name}</td>
                    <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{t.category?.name || '—'}</td>
                    <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${
                      Number(t.amount) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {Number(t.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, color }) {
  const colors = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-900 dark:text-gray-100',
  }
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      <div class={`text-2xl font-semibold font-mono mt-1 ${colors[color] || colors.gray}`}>{value}</div>
    </div>
  )
}

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
