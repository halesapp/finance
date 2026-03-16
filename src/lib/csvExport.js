import { supabase } from './supabase.js'

export async function exportTransactions(accountId, from, to) {
  let txnsQuery = supabase
    .from('transactions')
    .select('date, description, category:categories(name), amount, account:accounts(name)')
    .gte('date', from)
    .lte('date', to)
    .order('date')

  let transfersInQuery = supabase
    .from('transfers')
    .select('date, description, amount, account:accounts!transfers_to_account_id_fkey(name)')
    .gte('date', from)
    .lte('date', to)
    .order('date')

  let transfersOutQuery = supabase
    .from('transfers')
    .select('date, description, amount, account:accounts!transfers_from_account_id_fkey(name)')
    .gte('date', from)
    .lte('date', to)
    .order('date')

  if (accountId) {
    txnsQuery = txnsQuery.eq('account_id', accountId)
    transfersInQuery = transfersInQuery.eq('to_account_id', accountId)
    transfersOutQuery = transfersOutQuery.eq('from_account_id', accountId)
  }

  const [{ data: txns }, { data: transfersIn }, { data: transfersOut }] = await Promise.all([
    txnsQuery,
    transfersInQuery,
    transfersOutQuery,
  ])

  const rows = []

  for (const t of txns || []) {
    rows.push({
      date: t.date,
      payee: '',
      description: t.description || '',
      income: Number(t.amount) > 0 ? Number(t.amount) : '',
      expense: Number(t.amount) < 0 ? Math.abs(Number(t.amount)) : '',
      account: t.account?.name || '',
      category: t.category?.name || '',
      tax: false,
    })
  }
  for (const t of transfersIn || []) {
    rows.push({
      date: t.date,
      payee: 'Transfers',
      description: t.description || 'Transfer in',
      income: Number(t.amount),
      expense: '',
      account: t.account?.name || '',
      category: 'Transfers',
      tax: false,
    })
  }
  for (const t of transfersOut || []) {
    rows.push({
      date: t.date,
      payee: 'Transfers',
      description: t.description || 'Transfer out',
      income: '',
      expense: Number(t.amount),
      account: t.account?.name || '',
      category: 'Transfers',
      tax: false,
    })
  }

  rows.sort((a, b) =>
    a.date.localeCompare(b.date) ||
    a.description.localeCompare(b.description) ||
    a.category.localeCompare(b.category)
  )

  const lines = ['Date,Payee,Description,Income,Expense,Account,Category,Tax']
  for (const r of rows) {
    lines.push(
      [
        escapeCsv(r.date),
        escapeCsv(r.payee),
        escapeCsv(r.description),
        formatAmount(r.income),
        formatAmount(r.expense),
        escapeCsv(r.account),
        escapeCsv(r.category),
        r.tax ? 'TRUE' : 'FALSE',
      ].join(',')
    )
  }

  return lines.join('\n')
}

export function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatAmount(value) {
  return value === '' ? '' : Number(value).toFixed(2)
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}
