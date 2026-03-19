import {currentPage} from '../lib/state.js'
import {signOut} from '../lib/auth.js'
import {ArchiveIcon, ChartIcon, HomeIcon, MoneyIcon, PeopleIcon} from './icons.jsx'

const navItems = [
  {id: 'dashboard', label: 'Dashboard', svg: <HomeIcon/>},
  {id: 'reports', label: 'Reports', svg: <ChartIcon/>},
  {id: 'transactions', label: 'Transactions', svg: <MoneyIcon/>},
  {id: 'accounts', label: 'Accounts', svg: <ArchiveIcon/>},
  {id: 'transfers', label: 'Transfers', icon: '⇄'},
  {id: 'payees', label: 'Payees', svg: <PeopleIcon/>},
  {id: 'categories', label: 'Categories', icon: '⊞'},
  {id: 'retirement', label: 'Retirement', icon: '⊕'},
  {id: 'csv-import', label: 'Import', icon: '↑'},
  {id: 'csv-export', label: 'Export', icon: '↓'},
]

function NavButton({item}) {
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
        {navItems.map(item => <NavButton key={item.id} item={item}/>)}
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
