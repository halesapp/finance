export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export function startOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

export function startOfQuarter() {
  const d = new Date()
  const q = Math.floor(d.getMonth() / 3) * 3
  return new Date(d.getFullYear(), q, 1).toISOString().slice(0, 10)
}

export function getRange(preset) {
  switch (preset) {
    case 'mtd': return { from: startOfMonth(), to: today() }
    case 'ytd': return { from: startOfYear(), to: today() }
    case 'quarter': return { from: startOfQuarter(), to: today() }
    default: return { from: startOfYear(), to: today() }
  }
}
