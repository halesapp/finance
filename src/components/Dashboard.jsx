import {useEffect, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'

const fmt = n => Number(n).toLocaleString('en-US', {style: 'currency', currency: 'USD'})
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse "YYYY-MM-DD" without timezone shift
function parseDate(s) {
  const [y, m] = s.split('-')
  return {year: parseInt(y), month: parseInt(m) - 1}
}

export function Dashboard() {
  const [accountRows, setAccountRows] = useState([])
  const [netWorth, setNetWorth] = useState({startOfYear: 0, current: 0, net: 0})
  const [liquidWorth, setLiquidWorth] = useState({startOfYear: 0, current: 0, net: 0})
  const [investmentWorth, setInvestmentWorth] = useState({startOfYear: 0, current: 0, net: 0})
  const [retirementWorth, setRetirementWorth] = useState({startOfYear: 0, current: 0, net: 0})
  const [monthlyData, setMonthlyData] = useState([])
  const [monthlyNet, setMonthlyNet] = useState([])
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [allTxns, setAllTxns] = useState([])
  const [allTransfers, setAllTransfers] = useState([])
  const [allAccounts, setAllAccounts] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])
  useEffect(() => {
    if (selectedYear && allAccounts.length) computeAll()
  }, [selectedYear])

  async function loadData() {
    setLoading(true)
    try {
      const [{data: accounts}, {data: txns}, {data: transfers}, {data: categories}] = await Promise.all([
        supabase.from('money_accounts').select('*, bank:money_banks(name)'),
        supabase.from('money_transactions').select('*, category:money_categories(id, name, parent_category_id)'),
        supabase.from('money_transfers').select('*'),
        supabase.from('money_categories').select('*'),
      ])

      setAllTxns(txns || [])
      setAllTransfers(transfers || [])
      setAllAccounts(accounts || [])
      setAllCategories(categories || [])

      // Find available years from transactions
      const years = new Set()
      for (const t of txns || []) years.add(parseDate(t.date).year)
      const sorted = [...years].sort((a, b) => b - a)
      setAvailableYears(sorted)
      // setSelectedYear triggers computeAll via useEffect
      setSelectedYear(sorted[0] || new Date().getFullYear())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  function computeAll() {
    const jan1 = `${selectedYear}-01-01`
    const endOfYear = `${selectedYear}-12-31`
    const isCurrentYear = selectedYear === new Date().getFullYear()
    const cutoff = isCurrentYear ? '9999-12-31' : `${selectedYear + 1}-01-01`

    // --- Account balances ---
    const totals = {startOfYear: 0, current: 0}
    const liq = {startOfYear: 0, current: 0}
    const inv = {startOfYear: 0, current: 0}
    const ret = {startOfYear: 0, current: 0}
    const typeOrder = {checking: 0, savings: 1, credit: 2, investment: 3, retirement: 4, cash: 5}

    const acctRows = allAccounts.map(acct => {
      const anchor = Number(acct.initial_balance)
      const anchorDate = acct.initial_balance_date
      let startOfYear = anchor, current = anchor

      for (const t of allTxns) {
        if (t.account_id !== acct.id) continue
        const amt = Number(t.amount)
        // startOfYear: balance at jan1, computed from anchor
        if (jan1 >= anchorDate) {
          if (t.date >= anchorDate && t.date < jan1) startOfYear += amt
        } else {
          if (t.date >= jan1 && t.date < anchorDate) startOfYear -= amt
        }
        // current: balance at cutoff, computed from anchor
        if (cutoff >= anchorDate) {
          if (t.date >= anchorDate && t.date < cutoff) current += amt
        } else {
          if (t.date >= cutoff && t.date < anchorDate) current -= amt
        }
      }
      for (const tr of allTransfers) {
        let amt = 0
        if (tr.to_account_id === acct.id) amt = Number(tr.amount)
        else if (tr.from_account_id === acct.id) amt = -Number(tr.amount)
        else continue
        if (jan1 >= anchorDate) {
          if (tr.date >= anchorDate && tr.date < jan1) startOfYear += amt
        } else {
          if (tr.date >= jan1 && tr.date < anchorDate) startOfYear -= amt
        }
        if (cutoff >= anchorDate) {
          if (tr.date >= anchorDate && tr.date < cutoff) current += amt
        } else {
          if (tr.date >= cutoff && tr.date < anchorDate) current -= amt
        }
      }

      const bucket = acct.account_type === 'retirement' ? ret : acct.account_type === 'investment' ? inv : liq
      bucket.startOfYear += startOfYear;
      bucket.current += current
      totals.startOfYear += startOfYear;
      totals.current += current

      return {name: acct.name, bankName: acct.bank?.name || '', accountType: acct.account_type, startOfYear, current, net: current - startOfYear}
    })
    acctRows.sort((a, b) => {
      const bankCmp = a.bankName.localeCompare(b.bankName)
      if (bankCmp !== 0) return bankCmp
      return (typeOrder[a.accountType] ?? 9) - (typeOrder[b.accountType] ?? 9)
    })
    setAccountRows(acctRows)
    const mkWorth = b => ({startOfYear: b.startOfYear, current: b.current, net: b.current - b.startOfYear})
    setNetWorth(mkWorth(totals))
    setLiquidWorth(mkWorth(liq))
    setInvestmentWorth(mkWorth(inv))
    setRetirementWorth(mkWorth(ret))

    // --- Monthly by category ---
    const investmentAcctIds = new Set(allAccounts.filter(a => a.account_type === 'investment' || a.account_type === 'retirement').map(a => a.id))
    const catById = Object.fromEntries(allCategories.map(c => [c.id, c]))
    const parentGroups = allCategories.filter(c => !c.parent_category_id).map(c => c.name).sort()

    const grid = {}
    for (const g of parentGroups) grid[g] = new Array(12).fill(0)
    grid['Uncategorized'] = new Array(12).fill(0)

    for (const t of allTxns) {
      if (investmentAcctIds.has(t.account_id)) continue
      const {year, month} = parseDate(t.date)
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
      .map(([name, months]) => ({name, months, annual: months.reduce((s, v) => s + v, 0)}))
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
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Overview</h1>
        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Account balances */}
      <div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Account Balances</h2>
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Account</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Jan 1, {selectedYear}</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">{selectedYear === new Date().getFullYear() ? 'Current' : `Dec 31, ${selectedYear}`}</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">{selectedYear === new Date().getFullYear() ? 'YTD' : 'Net'}</th>
            </tr>
            </thead>
            <tbody>
            {accountRows.map(a => (
              <tr key={a.name} class="border-b border-gray-100 dark:border-gray-700 last:border-0">
                <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100">{a.name}</td>
                <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(a.startOfYear)}`}>{fmt(a.startOfYear)}</td>
                <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(a.current)}`}>{fmt(a.current)}</td>
                <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(a.net)}`}>{fmt(a.net)}</td>
              </tr>
            ))}
            {[
              {label: 'Liquid', data: liquidWorth},
              {label: 'Investments', data: investmentWorth},
              {label: 'Retirement', data: retirementWorth},
            ].filter(g => g.data.current !== 0 || g.data.startOfYear !== 0).length > 1 && <>
              <tr class="border-t border-gray-200 dark:border-gray-600"/>
              {[
                {label: 'Liquid', data: liquidWorth},
                {label: 'Investments', data: investmentWorth},
                {label: 'Retirement', data: retirementWorth},
              ].filter(g => g.data.current !== 0 || g.data.startOfYear !== 0).map(g => (
                <tr key={g.label}>
                  <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400">{g.label}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(g.data.startOfYear)}`}>{fmt(g.data.startOfYear)}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(g.data.current)}`}>{fmt(g.data.current)}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(g.data.net)}`}>{fmt(g.data.net)}</td>
                </tr>
              ))}
            </>}
            <tr class="bg-gray-50 dark:bg-gray-900 font-medium">
              <td class="px-3 py-2 text-gray-900 dark:text-gray-100">Net Worth</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(netWorth.startOfYear)}`}>{fmt(netWorth.startOfYear)}</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(netWorth.current)}`}>{fmt(netWorth.current)}</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(netWorth.net)}`}>{fmt(netWorth.net)}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly by category group */}
      <div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Monthly by Category</h2>
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
