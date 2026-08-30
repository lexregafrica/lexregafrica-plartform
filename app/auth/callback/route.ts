import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // Supabase redirects here with ?error=...&error_description=... when the
  // provider-side exchange itself failed (e.g. Google client secret
  // misconfigured, or the OAuth consent screen rejecting the request) —
  // there's no `code` to exchange in that case, so it used to fall straight
  // through to the generic "auth_callback_failed" with no trace of why.
  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')
  if (providerError) {
    console.error('auth callback: provider returned an error', { providerError, providerErrorDescription })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('auth callback: exchangeCodeForSession failed', error.message)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' | 'recovery' | 'invite' })
    if (!error) {
      const redirectTo = type === 'invite' ? '/invite/set-password' : next
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
    console.error('auth callback: verifyOtp failed', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
