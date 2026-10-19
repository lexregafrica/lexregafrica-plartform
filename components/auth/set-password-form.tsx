'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconAlertCircle, IconUser, IconBriefcase, IconEyeOff } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthHeader, PasswordField, PasswordStrength } from '@/components/auth/auth-shell'

const SERVICE_LABEL: Record<string, string> = {
  legal_audit: 'Legal audit',
  corporate_services: 'Corporate services',
}

type Matter = { entityName: string; service: string }

// Shared by /reset-password (recovery link) and /invite/set-password
// (lawyer invitation). Both arrive with a session: recovery via the PKCE
// code exchanged in /auth/callback, invites as #access_token in the URL
// hash — admin invites use the implicit flow, which the PKCE browser
// client won't pick up on its own, so the hash is read here.
export function SetPasswordForm({ mode }: { mode: 'reset' | 'invite' }) {
  const router = useRouter()
  const [ready, setReady] = useState<'checking' | 'ok' | 'expired'>('checking')
  const [fullName, setFullName] = useState('')
  const [matters, setMatters] = useState<Matter[]>([])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const access_token = hash.get('access_token')
      const refresh_token = hash.get('refresh_token')
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
        window.history.replaceState(null, '', window.location.pathname)
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setReady('expired'); return }
      setFullName((user.user_metadata?.full_name as string | undefined) ?? '')
      if (mode === 'invite') {
        const { data } = await supabase
          .from('lawyer_assignments')
          .select('service_type, entities(legal_name, trading_name)')
          .eq('lawyer_user_id', user.id)
          .eq('status', 'active')
        setMatters((data ?? []).map((a) => {
          const e = a.entities as { legal_name: string | null; trading_name: string | null } | null
          return { entityName: e?.legal_name ?? e?.trading_name ?? 'Assigned entity', service: SERVICE_LABEL[a.service_type] ?? a.service_type }
        }))
      }
      setReady('ok')
    })()
  }, [mode])

  const mismatch = confirm.length > 0 && confirm !== password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'invite' && !fullName.trim()) { setError('Please enter your full name.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      ...(mode === 'invite' ? { data: { full_name: fullName.trim() } } : {}),
    })
    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    router.replace('/dashboard')
  }

  const shellProps = mode === 'invite'
    ? { brandTitle: 'Review one matter, securely, in one place.' }
    : {}

  if (ready === 'checking') {
    return (
      <AuthShell {...shellProps}>
        <div className="flex flex-col gap-3" aria-busy="true">
          <div className="skeleton h-9 w-3/4" />
          <div className="skeleton h-5 w-full" />
          <div className="skeleton h-11 w-full" />
        </div>
      </AuthShell>
    )
  }

  if (ready === 'expired') {
    return (
      <AuthShell {...shellProps}>
        <AuthHeader
          title="This link has expired"
          subtitle={mode === 'invite'
            ? 'Invitation links work once and expire after a while. Ask the person who invited you to send a new one.'
            : 'Reset links work once and expire after a while. Request a new one to continue.'}
        />
        {mode === 'reset'
          ? <Link href="/forgot-password" className="btn btn-primary btn-lg btn-block">Send a new reset link</Link>
          : <Link href="/login" className="btn btn-gray btn-lg btn-block">Go to sign in</Link>}
      </AuthShell>
    )
  }

  return (
    <AuthShell {...shellProps}>
      {mode === 'invite' ? (
        <AuthHeader title="You’ve been invited to LexReg" subtitle="Set your password to open the matter assigned to you." />
      ) : (
        <AuthHeader title="Choose a new password" subtitle="You’ll use it the next time you sign in." />
      )}

      {mode === 'invite' && matters.length > 0 && (
        <section className="card rise" aria-label="Your assigned matter">
          {matters.map((m, i) => (
            <div key={`${m.entityName}-${m.service}`} className="flex items-center gap-3 p-4" style={i ? { borderTop: 'var(--hairline-soft)' } : undefined}>
              <span className="icon-tile" aria-hidden="true"><IconBriefcase size={18} stroke={1.75} /></span>
              <div className="min-w-0 flex-1">
                <p className="t-headline truncate">{m.service} — {m.entityName}</p>
                <p className="t-footnote t-3">Assigned matter</p>
              </div>
            </div>
          ))}
          <div className="note note-brand" style={{ borderRadius: 0 }}>
            <IconEyeOff size={18} stroke={1.75} aria-hidden="true" />
            <p>You&rsquo;ll only see this entity and this service. Nothing else in the client&rsquo;s account is visible to you.</p>
          </div>
        </section>
      )}

      {error && (
        <div className="note note-bad rise" role="alert">
          <IconAlertCircle size={18} stroke={1.75} aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className="rise flex flex-col gap-4" style={{ '--d': 1 } as React.CSSProperties}>
          {mode === 'invite' && (
            <div className="field">
              <label className="label" htmlFor="sp-name">Full name</label>
              <div className="input-wrap">
                <IconUser size={18} stroke={1.75} aria-hidden="true" className="absolute left-3" style={{ color: 'var(--label-3)', pointerEvents: 'none' }} />
                <input className="input" id="sp-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ paddingLeft: 38 }} />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <PasswordField id="sp-password" label={mode === 'invite' ? 'Password' : 'New password'} value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordStrength password={password} />
          </div>
          <div className="flex flex-col gap-1.5">
            <PasswordField id="sp-confirm" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={mismatch} />
            {mismatch && <p className="error">Passwords don&rsquo;t match yet.</p>}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary btn-lg btn-block rise" style={{ '--d': 2 } as React.CSSProperties}>
          {saving ? 'Saving…' : mode === 'invite' ? 'Accept invitation' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
