import { useState, useEffect, useCallback } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'

export function useSupabase(table, { orderBy = 'created_at', ascending = true, select = '*', filters = [] } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase.from(table).select(select)
    for (const f of filters) {
      query = query[f.method || 'eq'](f.column, f.value)
    }
    query = query.order(orderBy, { ascending })
    const { data: d, error: e } = await query
    setData(d || [])
    setError(e)
    setLoading(false)
  }, [table, select, orderBy, ascending, JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  async function insert(row) {
    const { data: d, error: e } = await supabase.from(table).insert(row).select()
    if (e) throw e
    await fetch()
    return d
  }

  async function update(id, row) {
    const { error: e } = await supabase.from(table).update(row).eq('id', id)
    if (e) throw e
    await fetch()
  }

  async function remove(id) {
    const { error: e } = await supabase.from(table).delete().eq('id', id)
    if (e) throw e
    await fetch()
  }

  return { data, loading, error, refetch: fetch, insert, update, remove }
}
