import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  __SUPABASE_URL__,
  __SUPABASE_PUBLISHABLE_KEY__
)
