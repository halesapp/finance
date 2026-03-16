import { currentPage } from '../lib/state.js'
import { signOut } from '../lib/auth.js'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', svg: <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg> },
  { id: 'transactions', label: 'Transactions', svg: <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg> },
  { id: 'transfers', label: 'Transfers', icon: '⇄' },
  { id: 'accounts', label: 'Accounts', svg: <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg> },
  { id: 'categories', label: 'Categories', icon: '⊞' },
  { id: 'banks', label: 'Banks', svg: <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/></svg> },
  { id: 'csv-import', label: 'Import', icon: '↑' },
  { id: 'csv-export', label: 'Export', icon: '↓' },
]

function NavButton({ item }) {
  const active = currentPage.value === item.id
  return (
    <button
      onClick={() => currentPage.value = item.id}
      class={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left ${
        active
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <span class="w-5 text-center flex items-center justify-center">{item.svg || <span class="text-base">{item.icon}</span>}</span>
      <span class="hidden lg:inline">{item.label}</span>
    </button>
  )
}

export function NavBar() {
  return (
    <>
      {/* Desktop sidebar */}
      <nav class="hidden md:flex flex-col w-48 lg:w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 gap-1 shrink-0">
        <div class="text-lg font-semibold text-gray-900 dark:text-gray-100 px-3 py-2 mb-2">Finance</div>
        {navItems.map(item => <NavButton key={item.id} item={item} />)}
        <div class="mt-auto">
          <button
            onClick={signOut}
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left"
          >
            <span class="text-base w-5 text-center">⏻</span>
            <span class="hidden lg:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around py-1 px-1 z-50">
        {navItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => currentPage.value = item.id}
            class={`flex flex-col items-center py-1 px-2 text-xs rounded ${
              currentPage.value === item.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span class="flex items-center justify-center h-5">{item.svg || <span class="text-lg">{item.icon}</span>}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => currentPage.value = currentPage.value === '_more' ? 'dashboard' : '_more'}
          class="flex flex-col items-center py-1 px-2 text-xs text-gray-500 dark:text-gray-400 rounded"
        >
          <span class="text-lg">⋯</span>
          <span>More</span>
        </button>
      </nav>
    </>
  )
}

export function MobileMoreMenu() {
  if (currentPage.value !== '_more') return null
  const moreItems = navItems.slice(5)
  return (
    <div class="md:hidden p-4 space-y-2">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">More</h2>
      {moreItems.map(item => (
        <button
          key={item.id}
          onClick={() => currentPage.value = item.id}
          class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left"
        >
          <span class="flex items-center justify-center h-5">{item.svg || <span class="text-lg">{item.icon}</span>}</span>
          <span>{item.label}</span>
        </button>
      ))}
      <button
        onClick={signOut}
        class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left mt-4"
      >
        <span class="text-lg">⏻</span>
        <span>Sign Out</span>
      </button>
    </div>
  )
}
