import { NavBar } from './NavBar.jsx'
import { Toast } from './Toast.jsx'

export function Layout({ children }) {
  return (
    <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <main class="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div class="max-w-5xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
      <Toast />
    </div>
  )
}
