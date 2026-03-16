import { supabase } from './supabase.js'
import { session, profile } from './state.js'

export async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  profile.value = data
}

export async function initAuth() {
  const { data: { session: s } } = await supabase.auth.getSession()
  session.value = s
  if (s?.user) await fetchProfile(s.user.id)

  supabase.auth.onAuthStateChange(async (_event, s) => {
    session.value = s
    if (s?.user) {
      await fetchProfile(s.user.id)
    } else {
      profile.value = null
    }
  })

  // Re-check session when tab regains focus (catches expired tokens after idle)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const { data: { session: s } } = await supabase.auth.getSession()
      session.value = s
      if (!s) profile.value = null
    }
  })
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
