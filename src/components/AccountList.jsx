import { useState } from 'preact/hooks'
import { useSupabase } from '../hooks/useSupabase.js'
import { AccountForm } from './AccountForm.jsx'
import { BankForm } from './BankForm.jsx'
import { ConfirmModal } from './ConfirmModal.jsx'

const typeOrder = { checking: 0, savings: 1, credit: 2, investment: 3, cash: 4 }

const sortFns = {
  'bank-type': (a, b) => {
    const bankCmp = (a.bank?.name || '').localeCompare(b.bank?.name || '')
    if (bankCmp !== 0) return bankCmp
    return (typeOrder[a.account_type] ?? 9) - (typeOrder[b.account_type] ?? 9)
  },
  'type-bank': (a, b) => {
    const typeCmp = (typeOrder[a.account_type] ?? 9) - (typeOrder[b.account_type] ?? 9)
    if (typeCmp !== 0) return typeCmp
    return (a.bank?.name || '').localeCompare(b.bank?.name || '')
  },
  name: (a, b) => a.name.localeCompare(b.name),
}

export function AccountList() {
  const { data: rawAccounts, loading: acctLoading, insert: insertAcct, update: updateAcct } = useSupabase('accounts', {
    select: '*, bank:banks(name)',
    orderBy: 'name',
  })
  const { data: banks, loading: bankLoading, insert: insertBank, update: updateBank, remove: removeBank } = useSupabase('banks', { orderBy: 'name' })

  const [editingAcct, setEditingAcct] = useState(null)
  const [editingBank, setEditingBank] = useState(null)
  const [deletingBank, setDeletingBank] = useState(null)
  const [showClosed, setShowClosed] = useState(false)
  const [sortKey, setSortKey] = useState('bank-type')

  const accounts = [...rawAccounts].sort(sortFns[sortKey] || sortFns['bank-type'])

  async function handleSaveAcct(account) {
    if (editingAcct === 'new') {
      await insertAcct(account)
    } else {
      await updateAcct(editingAcct.id, account)
    }
    setEditingAcct(null)
  }

  async function handleSaveBank(bank) {
    if (editingBank === 'new') {
      await insertBank(bank)
    } else {
      await updateBank(editingBank.id, bank)
    }
    setEditingBank(null)
  }

  async function handleDeleteBank() {
    await removeBank(deletingBank)
    setDeletingBank(null)
  }

  async function handleToggleClosed(acct) {
    await updateAcct(acct.id, { is_closed: !acct.is_closed })
  }

  function cycleSortKey(column) {
    if (column === 'bank') {
      setSortKey(sortKey === 'bank-type' ? 'type-bank' : 'bank-type')
    } else if (column === 'type') {
      setSortKey(sortKey === 'type-bank' ? 'bank-type' : 'type-bank')
    } else if (column === 'name') {
      setSortKey('name')
    }
  }

  function sortIndicator(column) {
    if (column === 'bank' && sortKey === 'bank-type') return ' 1'
    if (column === 'type' && sortKey === 'bank-type') return ' 2'
    if (column === 'type' && sortKey === 'type-bank') return ' 1'
    if (column === 'bank' && sortKey === 'type-bank') return ' 2'
    if (column === 'name' && sortKey === 'name') return ' 1'
    return ''
  }

  if (acctLoading || bankLoading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  const openAccounts = accounts.filter(a => !a.is_closed)
  const closedAccounts = accounts.filter(a => a.is_closed)
  const displayed = showClosed ? closedAccounts : openAccounts

  const thSort = 'cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400'
  const thBase = 'text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400'
  const fmt = n => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <div class="space-y-3">
      {/* Banks section */}
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Banks</h1>
        <button onClick={() => setEditingBank('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
          Add Bank
        </button>
      </div>

      {editingBank !== null && (
        <BankForm
          bank={editingBank === 'new' ? null : editingBank}
          onSave={handleSaveBank}
          onCancel={() => setEditingBank(null)}
        />
      )}

      {banks.length > 0 && (
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class={thBase}>Name</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {banks.map(b => (
                <tr key={b.id} class="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100">{b.name}</td>
                  <td class="px-3 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditingBank(b)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/><path d="M19.5 7.125L16.862 4.487"/></svg></button>
                    <button onClick={() => setDeletingBank(b.id)} class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Accounts section */}
      <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Accounts</h1>
        <div class="flex gap-2">
          {closedAccounts.length > 0 && (
            <button onClick={() => setShowClosed(!showClosed)}
              class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              {showClosed ? `Open (${openAccounts.length})` : `Closed (${closedAccounts.length})`}
            </button>
          )}
          {!showClosed && (
            <button onClick={() => setEditingAcct('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
              Add Account
            </button>
          )}
        </div>
      </div>

      {editingAcct !== null && (
        <AccountForm
          account={editingAcct === 'new' ? null : editingAcct}
          onSave={handleSaveAcct}
          onCancel={() => setEditingAcct(null)}
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
                <th class={`${thBase} ${thSort}`} onClick={() => cycleSortKey('name')}>
                  Name{sortIndicator('name') && <span class="text-blue-500 text-[10px] ml-0.5">{sortIndicator('name')}</span>}
                </th>
                <th class={`${thBase} ${thSort}`} onClick={() => cycleSortKey('bank')}>
                  Bank<span class="text-blue-500 text-[10px] ml-0.5">{sortIndicator('bank')}</span>
                </th>
                <th class={`${thBase} ${thSort}`} onClick={() => cycleSortKey('type')}>
                  Type<span class="text-blue-500 text-[10px] ml-0.5">{sortIndicator('type')}</span>
                </th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Initial Balance</th>
                <th class={thBase}>As of</th>
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
                    {fmt(a.initial_balance)}
                  </td>
                  <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{a.initial_balance_date}</td>
                  <td class="px-3 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditingAcct(a)}
                      class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit">
                      <svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                        <path d="M19.5 7.125L16.862 4.487"/>
                      </svg>
                    </button>
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

      {deletingBank && (
        <ConfirmModal
          message="Delete this bank and all its accounts?"
          onConfirm={handleDeleteBank}
          onCancel={() => setDeletingBank(null)}
        />
      )}
    </div>
  )
}
