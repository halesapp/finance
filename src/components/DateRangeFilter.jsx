import { getRange } from '../lib/dateUtils.js'

const presets = [
  { id: 'mtd', label: 'MTD' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'ytd', label: 'YTD' },
]

export function DateRangeFilter({ from, to, onChange }) {
  function applyPreset(id) {
    const range = getRange(id)
    onChange(range)
  }

  return (
    <div class="flex flex-wrap items-center gap-2">
      {presets.map(p => (
        <button
          key={p.id}
          onClick={() => applyPreset(p.id)}
          class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          {p.label}
        </button>
      ))}
      <input type="date" value={from} onInput={e => onChange({ from: e.target.value, to })}
        class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <span class="text-gray-500 dark:text-gray-400 text-sm">to</span>
      <input type="date" value={to} onInput={e => onChange({ from, to: e.target.value })}
        class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}
