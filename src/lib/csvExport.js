import { supabase } from './supabase.js'

export async function exportTransactions(accountId, from, to, initialBalance) {
  const { data: txns } = await supabase
    .from('transactions')
    .select('date, description, category:categories(name), type, amount')
    .eq('account_id', accountId)
    .gte('date', from)
    .lte('date', to)
    .order('date')

  const { data: transfersIn } = await supabase
    .from('transfers')
    .select('date, description, amount')
    .eq('to_account_id', accountId)
    .gte('date', from)
    .lte('date', to)
    .order('date')

  const { data: transfersOut } = await supabase
    .from('transfers')
    .select('date, description, amount')
    .eq('from_account_id', accountId)
    .gte('date', from)
    .lte('date', to)
    .order('date')

  const rows = []

  for (const t of txns || []) {
    rows.push({
      date: t.date,
      description: t.description || '',
      category: t.category?.name || '',
      amount: Number(t.amount),
    })
  }
  for (const t of transfersIn || []) {
    rows.push({
      date: t.date,
      description: t.description || 'Transfer in',
      category: 'Transfer',
      amount: Number(t.amount),
    })
  }
  for (const t of transfersOut || []) {
    rows.push({
      date: t.date,
      description: t.description || 'Transfer out',
      category: 'Transfer',
      amount: -Number(t.amount),
    })
  }

  rows.sort((a, b) => a.date.localeCompare(b.date))

  let balance = initialBalance
  const lines = ['Date,Description,Category,Amount,Balance']
  for (const r of rows) {
    balance += r.amount
    lines.push(
      [r.date, `"${r.description}"`, `"${r.category}"`, r.amount.toFixed(2), balance.toFixed(2)].join(',')
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
