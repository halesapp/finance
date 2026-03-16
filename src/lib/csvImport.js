export function parseCsv(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map(parseCsvLine)
  return { headers, rows }
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export function detectFormat(headers) {
  const lower = headers.map(h => h.toLowerCase())

  // Generic: Date, Amount, Description
  if (lower.includes('date') && lower.includes('amount')) {
    return {
      name: 'generic',
      dateCol: lower.indexOf('date'),
      amountCol: lower.indexOf('amount'),
      descCol: lower.includes('description') ? lower.indexOf('description') : -1,
    }
  }

  return null
}

export function mapToTransactions(rows, format, accountId, payeeId) {
  return rows
    .map(row => {
      const amount = parseFloat(row[format.amountCol])
      if (isNaN(amount)) return null

      return {
        account_id: accountId,
        payee_id: payeeId,
        date: row[format.dateCol],
        amount: Math.abs(amount),
        type: amount >= 0 ? 'deposit' : 'withdrawal',
        description: format.descCol >= 0 ? row[format.descCol] : '',
      }
    })
    .filter(Boolean)
}
