import { useState } from 'preact/hooks'

export function CategoryForm({ category, categories, onSave, onCancel }) {
  const [name, setName] = useState(category?.name || '')
  const [parentId, setParentId] = useState(category?.parent_category_id || '')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const parentOptions = (categories || []).filter(c => c.id !== category?.id)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        parent_category_id: parentId || null,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h3 class="font-medium text-gray-900 dark:text-gray-100">{category ? 'Edit Category' : 'New Category'}</h3>
      {error && <p class="text-red-600 text-sm">{error}</p>}
      <div class="grid grid-cols-2 gap-3">
        <input type="text" placeholder="Category name" value={name} onInput={e => setName(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={parentId} onChange={e => setParentId(e.target.value)}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">No parent</option>
          {parentOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div class="flex gap-2">
        <button type="submit" disabled={saving} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} class="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
          Cancel
        </button>
      </div>
    </form>
  )
}
