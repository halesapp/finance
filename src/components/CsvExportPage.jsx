import {useEffect, useState} from 'preact/hooks'
import {supabase} from '../lib/supabase.js'
import {downloadCsv, exportTransactions} from '../lib/csvExport.js'
import {DateRangeFilter} from './DateRangeFilter.jsx'
import {getRange} from '../lib/dateUtils.js'

export function CsvExportPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('all')
  const [range, setRange] = useState(getRange('ytd'))
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('money_accounts').select('id, name, initial_balance').order('name').then(({data}) => {
      setAccounts(data || [])
    })
  }, [])

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const selectedAccountId = accountId === 'all' ? null : accountId
      const acct = accounts.find(a => a.id === accountId)
      const accountSlug = acct ? acct.name.replace(/\s+/g, '-') : 'all-accounts'
      const csv = await exportTransactions(selectedAccountId, range.from, range.to)
      downloadCsv(csv, `transactions-${accountSlug}-${range.from}-to-${range.to}.csv`)
    } catch (e) {
      setError(e.message)
    }
    setExporting(false)
  }

  return (
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Export CSV</h1>

      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {error && <p class="text-red-600 text-sm">{error}</p>}
        <div>
          <label class="text-sm text-gray-500 dark:text-gray-400">Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange}/>
        <button onClick={handleExport} disabled={exporting}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
          {exporting ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>
    </div>
  )
}
