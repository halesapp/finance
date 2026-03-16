import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { useSupabase } from '../hooks/useSupabase.js'
import { CategoryForm } from './CategoryForm.jsx'
import { ConfirmModal } from './ConfirmModal.jsx'

export function CategoryList() {
  const { data: categories, loading, insert, update, remove, refetch } = useSupabase('categories', { orderBy: 'name' })
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

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

  async function handleBulkDelete() {
    await supabase.from('categories').delete().in('id', [...selected])
    setSelected(new Set())
    setBulkDeleting(false)
    refetch()
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map(r => r.id)))
    }
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
        <div class="flex gap-2">
          {selected.size > 0 && (
            <button onClick={() => setBulkDeleting(true)}
              class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
              Delete {selected.size} selected
            </button>
          )}
          <button onClick={() => setEditingId('new')} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
            Add Category
          </button>
        </div>
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
                <th class="px-3 py-2 w-8">
                  <input type="checkbox" checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleAll} class="rounded" />
                </th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} class={`border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${c.depth === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}>
                  <td class="px-3 py-1.5">
                    <input type="checkbox" checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)} class="rounded" />
                  </td>
                  <td class="px-3 py-1.5 text-gray-900 dark:text-gray-100 whitespace-nowrap"
                    style={{ paddingLeft: `${c.depth * 20 + 12}px` }}>
                    {c.depth > 0 && <span class="text-gray-300 dark:text-gray-600 mr-1">└</span>}
                    <span class={c.depth === 0 ? 'font-medium' : ''}>{c.name}</span>
                  </td>
                  <td class="px-3 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditingId(c.id)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2" title="Edit"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/><path d="M19.5 7.125L16.862 4.487"/></svg></button>
                    <button onClick={() => setDeletingId(c.id)} class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>
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

      {bulkDeleting && (
        <ConfirmModal
          message={`Delete ${selected.size} categories? Existing transactions will become uncategorized.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleting(false)}
        />
      )}
    </div>
  )
}
