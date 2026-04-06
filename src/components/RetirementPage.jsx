import {useEffect, useMemo, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'

const fmt = n => Number(n).toLocaleString('en-US', {style: 'currency', currency: 'USD'})

export function RetirementPage() {
  const [accounts, setAccounts] = useState([])
  const [txns, setTxns] = useState([])
  const [transfers, setTransfers] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('money_accounts').select('id, name, account_type').order('name'),
      supabase.from('money_transactions').select('id, account_id, amount, date, category_id'),
      supabase.from('money_transfers').select('id, from_account_id, to_account_id, amount, date'),
      supabase.from('money_categories').select('id, name, parent_category_id'),
    ]).then(([{data: a}, {data: t}, {data: tr}, {data: c}]) => {
      setAccounts(a || [])
      setTxns(t || [])
      setTransfers(tr || [])
      setCategories(c || [])
      setLoading(false)
    })
  }, [])

  const retirementAcctIds = useMemo(() =>
      new Set(accounts.filter(a => a.account_type === 'retirement').map(a => a.id)),
    [accounts])

  const catById = useMemo(() =>
      Object.fromEntries(categories.map(c => [c.id, c])),
    [categories])

  // Identify IRA vs 401K accounts by name heuristic
  const iraAcctIds = useMemo(() =>
      new Set(accounts.filter(a => a.account_type === 'retirement' && /ira/i.test(a.name)).map(a => a.id)),
    [accounts])

  const yearlyData = useMemo(() => {
    const map = {}
    const ensureYear = y => {
      if (!map[y]) map[y] = {year: y, employeeContrib: 0, employerContrib: 0, personalRetirement: 0, fees: 0}
    }

    // Transactions on retirement accounts (401K contributions + fees)
    for (const t of txns) {
      if (!retirementAcctIds.has(t.account_id)) continue
      if (iraAcctIds.has(t.account_id)) continue // IRA transactions handled separately if needed
      const year = parseInt(t.date.slice(0, 4))
      ensureYear(year)
      const cat = catById[t.category_id]
      const catName = cat?.name?.toLowerCase() || ''
      if (catName.includes('employer')) {
        map[year].employerContrib += Number(t.amount)
      } else if (catName.includes('personal contrib') || catName.includes('employee')) {
        map[year].employeeContrib += Number(t.amount)
      } else if (catName.includes('fee')) {
        map[year].fees += Number(t.amount)
      }
    }

    // Transfers INTO IRA accounts from non-retirement accounts
    for (const tr of transfers) {
      if (!iraAcctIds.has(tr.to_account_id)) continue
      if (retirementAcctIds.has(tr.from_account_id)) continue
      const year = parseInt(tr.date.slice(0, 4))
      ensureYear(year)
      map[year].personalRetirement += Number(tr.amount)
    }

    return Object.values(map).sort((a, b) => b.year - a.year)
  }, [txns, transfers, retirementAcctIds, iraAcctIds, catById])

  const totals = useMemo(() => {
    const t = {employeeContrib: 0, employerContrib: 0, personalRetirement: 0, fees: 0}
    for (const r of yearlyData) {
      t.employeeContrib += r.employeeContrib
      t.employerContrib += r.employerContrib
      t.personalRetirement += r.personalRetirement
      t.fees += r.fees
    }
    return t
  }, [yearlyData])

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  const colorClass = n => Number(n) < 0 ? 'text-red-600 dark:text-red-400' : Number(n) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'

  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Retirement</h1>

      {/* Stat cards */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label: 'Pre-tax 401K', value: totals.employeeContrib},
          {label: 'Employer Match', value: totals.employerContrib},
          {label: 'After-tax IRA', value: totals.personalRetirement},
          {label: 'Total Contributed', value: totals.employeeContrib + totals.employerContrib + totals.personalRetirement},
        ].map(s => (
          <div key={s.label} class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</div>
            <div class={`text-lg font-semibold font-mono mt-0.5 ${colorClass(s.value)}`}>{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      {/* Yearly breakdown */}
      <div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Yearly Contributions</h2>
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Year</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Pre-tax 401K</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Employer Match</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">After-tax IRA</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Fees</th>
              <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Total</th>
            </tr>
            </thead>
            <tbody>
            {yearlyData.map(r => {
              const total = r.employeeContrib + r.employerContrib + r.personalRetirement + r.fees
              return (
                <tr key={r.year} class="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 font-medium">{r.year}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(r.employeeContrib)}`}>
                    {r.employeeContrib ? fmt(r.employeeContrib) : '—'}
                  </td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(r.employerContrib)}`}>
                    {r.employerContrib ? fmt(r.employerContrib) : '—'}
                  </td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(r.personalRetirement)}`}>
                    {r.personalRetirement ? fmt(r.personalRetirement) : '—'}
                  </td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${colorClass(r.fees)}`}>
                    {r.fees ? fmt(r.fees) : '—'}
                  </td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap font-medium ${colorClass(total)}`}>
                    {fmt(total)}
                  </td>
                </tr>
              )
            })}
            <tr class="bg-gray-50 dark:bg-gray-900 font-medium">
              <td class="px-3 py-2 text-gray-900 dark:text-gray-100">Total</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(totals.employeeContrib)}`}>{fmt(totals.employeeContrib)}</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(totals.employerContrib)}`}>{fmt(totals.employerContrib)}</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(totals.personalRetirement)}`}>{fmt(totals.personalRetirement)}</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(totals.fees)}`}>{fmt(totals.fees)}</td>
              <td class={`px-3 py-2 text-right font-mono whitespace-nowrap ${colorClass(totals.employeeContrib + totals.employerContrib + totals.personalRetirement + totals.fees)}`}>
                {fmt(totals.employeeContrib + totals.employerContrib + totals.personalRetirement + totals.fees)}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
