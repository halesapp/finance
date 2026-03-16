import { useState } from 'preact/hooks'
import { signIn } from '../lib/auth.js'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <form onSubmit={handleSubmit} class="w-full max-w-sm space-y-4">
        <h1 class="text-2xl font-semibold text-center text-gray-900 dark:text-gray-100">Finance</h1>
        {error && <p class="text-red-600 text-sm text-center">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onInput={e => setEmail(e.target.value)}
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onInput={e => setPassword(e.target.value)}
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
