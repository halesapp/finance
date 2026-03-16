import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { parseCsv, detectFormat, mapToTransactions } from '../lib/csvImport.js'

export function CsvImportPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [preview, setPreview] = useState(null)
  const [mapped, setMapped] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => {
      setAccounts(data || [])
      if (data?.length) setAccountId(data[0].id)
    })
  }, [])

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setResult(null)
    setError(null)

    const reader = new FileReader()
    reader.onload = () => {
      const { headers, rows } = parseCsv(reader.result)
      const format = detectFormat(headers)
      if (!format) {
        setError('Unrecognized CSV format. Expected columns: Date, Amount, and optionally Description.')
        return
      }
      setPreview({ headers, rows: rows.slice(0, 10), totalRows: rows.length })
      setMapped(mapToTransactions(rows, format, accountId))
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!mapped.length) return
    setImporting(true)
    setError(null)
    try {
      // Update account_id in case user changed it after file load
      const rows = mapped.map(t => ({ ...t, account_id: accountId }))
      const { error: e } = await supabase.from('transactions').insert(rows)
      if (e) throw e
      setResult(`Imported ${rows.length} transactions.`)
      setPreview(null)
      setMapped([])
    } catch (e) {
      setError(e.message)
    }
    setImporting(false)
  }

  return (
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Import CSV</h1>

      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {error && <p class="text-red-600 text-sm">{error}</p>}
        {result && <p class="text-green-600 dark:text-green-400 text-sm">{result}</p>}

        <div>
          <label class="text-sm text-gray-500 dark:text-gray-400">Account</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <input type="file" accept=".csv" onChange={handleFile}
          class="text-sm text-gray-600 dark:text-gray-400" />

        {preview && (
          <>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Preview ({preview.totalRows} rows total, showing first 10):
            </p>
            <div class="overflow-x-auto">
              <table class="text-xs w-full">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    {preview.headers.map((h, i) => (
                      <th key={i} class="py-1 px-2 text-left text-gray-500 dark:text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} class="border-b border-gray-100 dark:border-gray-700">
                      {row.map((cell, j) => (
                        <td key={j} class="py-1 px-2 text-gray-900 dark:text-gray-100">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleImport} disabled={importing}
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50">
              {importing ? 'Importing...' : `Import ${mapped.length} transactions`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
