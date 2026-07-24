import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Service-role client — bypasses RLS entirely. Server-only, never import
// from a client component or expose the key to the browser.
//
// Used for genuinely privileged platform-admin actions that RLS can't
// express as an ordinary policy (e.g. inserting a lawyer into another
// organisation's membership list, or calling auth.admin.*). Every call
// site must independently verify the caller is_super_admin() using the
// normal session-scoped client before touching this.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
