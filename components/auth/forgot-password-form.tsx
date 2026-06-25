'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.email('Enter a valid email'),
})
type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/reset-password`,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="size-12" style={{ color: 'var(--brand-gold)' }} />
        </div>
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          We sent a password reset link. It expires in 1 hour.
        </p>
        <a href="/login" className="block text-sm underline underline-offset-2 text-muted-foreground">
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Send reset link
      </Button>

      <a href="/login" className="block text-center text-sm text-muted-foreground hover:underline">
        Back to sign in
      </a>
    </form>
  )
}
