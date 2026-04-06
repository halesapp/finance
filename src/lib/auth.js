import {supabase} from './supabase.js'
import {profile, session} from './state.js'

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
let idleTimer = null

export async function fetchProfile(userId) {
  const { data } = await supabase
    .from('money_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  profile.value = data
}

function resetIdleTimer() {
  if (!session.value) return
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    session.value = null
    profile.value = null
    supabase.auth.signOut()
  }, IDLE_TIMEOUT)
}

function startIdleTimer() {
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart']
  for (const e of events) {
    document.addEventListener(e, resetIdleTimer, { passive: true })
  }
  resetIdleTimer()
}

function stopIdleTimer() {
  clearTimeout(idleTimer)
  idleTimer = null
}

export async function initAuth() {
  const { data: { session: s } } = await supabase.auth.getSession()
  session.value = s
  if (s?.user) await fetchProfile(s.user.id)

  supabase.auth.onAuthStateChange(async (_event, s) => {
    session.value = s
    if (s?.user) {
      await fetchProfile(s.user.id)
      startIdleTimer()
    } else {
      profile.value = null
      stopIdleTimer()
    }
  })

  if (s) startIdleTimer()
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  stopIdleTimer()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
