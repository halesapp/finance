import { useState } from 'preact/hooks'
import { useSupabase } from '../hooks/useSupabase.js'
import { AccountForm } from './AccountForm.jsx'

export function AccountList() {
  const { data: accounts, loading, insert, update, remove, refetch } = useSupabase('accounts', {
    select: '*, bank:banks(name)',
    orderBy: 'name',
  })
  const [editing, setEditing] = useState(null)
  const [showClosed, setShowClosed] = useState(false)

  async function handleSave(account) {
    if (editing === 'new') {
      await insert(account)
    } else {
      await update(editing.id, account)
    }
    setEditing(null)
  }

  async function handleToggleClosed(acct) {
    await update(acct.id, { is_closed: !acct.is_closed })
  }

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  const openAccounts = accounts.filter(a => !a.is_closed)
  const closedAccounts = accounts.filter(a => a.is_closed)
  const displayed = showClosed ? closedAccounts : openAccounts

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Accounts</h1>
        <div class="flex gap-2">
          {closedAccounts.length > 0 && (
            <button onClick={() => setShowClosed(!showClosed)}
              class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              {showClosed ? `Open (${openAccounts.length})` : `Closed (${closedAccounts.length})`}
            </button>
          )}
          {!showClosed && (
            <button onClick={() => setEditing('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
              Add Account
            </button>
          )}
        </div>
      </div>

      {editing !== null && (
        <AccountForm
          account={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {displayed.length === 0 ? (
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          {showClosed ? 'No closed accounts.' : 'No accounts yet. Add a bank first.'}
        </p>
      ) : (
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Bank</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Initial Balance</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">As of</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(a => (
                <tr key={a.id} class={`border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${a.is_closed ? 'opacity-50' : ''}`}>
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100">
                    {a.name}
                    {a.is_closed && <span class="ml-1 text-gray-400">(closed)</span>}
                  </td>
                  <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{a.bank?.name}</td>
                  <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{a.account_type}</td>
                  <td class={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${Number(a.initial_balance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {Number(a.initial_balance).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </td>
                  <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{a.initial_balance_date}</td>
                  <td class="px-3 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(a)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/><path d="M19.5 7.125L16.862 4.487"/></svg></button>
                    <button onClick={() => handleToggleClosed(a)}
                      class={`hover:underline mr-2 ${a.is_closed ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      {a.is_closed ? 'reopen' : 'close'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
