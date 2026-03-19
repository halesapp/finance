import {useState} from 'preact/hooks'
import {useSupabase} from '../hooks/useSupabase.js'
import {CategoryForm} from './CategoryForm.jsx'
import {ConfirmModal} from './ConfirmModal.jsx'
import {DeleteIcon, EditIcon} from './icons.jsx'

export function CategoryList() {
  const { data: categories, loading, insert, update, remove } = useSupabase('categories', { orderBy: 'name' })
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const editingCategory = editingId === 'new' ? null : categories.find(c => c.id === editingId) || null

  async function handleSave(cat) {
    if (editingId === 'new') {
      await insert(cat)
    } else {
      await update(editingId, cat)
    }
    setEditingId(null)
  }

  async function handleDelete() {
    await remove(deletingId)
    setDeletingId(null)
  }

  if (loading) return <p class="text-gray-500 dark:text-gray-400 py-8">Loading...</p>

  // Build tree
  const byId = Object.fromEntries(categories.map(c => [c.id, { ...c, children: [] }]))
  const roots = []
  for (const c of Object.values(byId)) {
    if (c.parent_category_id && byId[c.parent_category_id]) {
      byId[c.parent_category_id].children.push(c)
    } else {
      roots.push(c)
    }
  }

  // Flatten tree into rows for table display
  const rows = []
  function flatten(node, depth) {
    rows.push({ ...node, depth })
    for (const child of node.children) flatten(child, depth + 1)
  }
  for (const r of roots) flatten(r, 0)

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Categories</h1>
        <button onClick={() => setEditingId('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
          Add Category
        </button>
      </div>

      {editingId !== null && (
        <CategoryForm
          category={editingCategory}
          categories={categories}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
        />
      )}

      {rows.length === 0 ? (
        <p class="text-gray-500 dark:text-gray-400 text-sm">No categories yet.</p>
      ) : (
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} class={`border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${c.depth === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}>
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 whitespace-nowrap"
                    style={{ paddingLeft: `${c.depth * 20 + 12}px` }}>
                    {c.depth > 0 && <span class="text-gray-300 dark:text-gray-600 mr-1">└</span>}
                    <span class={c.depth === 0 ? 'font-medium' : ''}>{c.name}</span>
                  </td>
                  <td class="px-3 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditingId(c.id)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><EditIcon/></button>
                    <button onClick={() => setDeletingId(c.id)} class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><DeleteIcon/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deletingId && (
        <ConfirmModal
          message="Delete this category? Existing transactions will become uncategorized."
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  )
}
