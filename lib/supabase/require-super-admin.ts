import { createClient } from '@/lib/supabase/server'

// Shared guard for every /admin page and /api/admin/* route — checks the
// is_super_admin() DB function (security definer, same one RLS policies
// use) via the caller's own session, never trusting a client-supplied flag.
export async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isSuperAdmin: false, supabase }

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  return { user, isSuperAdmin: isSuperAdmin === true, supabase }
}
