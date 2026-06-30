'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'motion/react'

const INACTIVITY_MS = 30 * 60 * 1000  // 30 minutes
const WARN_MS = 5 * 60 * 1000         // warn 5 minutes before
const TICK_MS = 10_000                 // check every 10 seconds

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel', 'focus'] as const

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const lastActivityRef = useRef(Date.now())
  const [warnSecondsLeft, setWarnSecondsLeft] = useState<number | null>(null)
  const warnRef = useRef(false)

  const signOutAndRedirect = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }, [router])

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (warnRef.current) {
      warnRef.current = false
      setWarnSecondsLeft(null)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Sign out elsewhere or token hard-expires → go to landing
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/')
    })

    // Activity listeners
    const handleActivity = () => resetActivity()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }))

    // Tab visibility: if returning after long absence, check immediately
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const idle = Date.now() - lastActivityRef.current
        if (idle >= INACTIVITY_MS) signOutAndRedirect()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Periodic inactivity check
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current

      if (idle >= INACTIVITY_MS) {
        clearInterval(interval)
        signOutAndRedirect()
        return
      }

      const timeLeft = INACTIVITY_MS - idle
      if (timeLeft <= WARN_MS) {
        const seconds = Math.ceil(timeLeft / 1000)
        warnRef.current = true
        setWarnSecondsLeft(seconds)
      }
    }, TICK_MS)

    // Countdown tick (1s) when warning is visible
    const countdown = setInterval(() => {
      if (!warnRef.current) return
      setWarnSecondsLeft((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          signOutAndRedirect()
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      subscription.unsubscribe()
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
      clearInterval(countdown)
    }
  }, [resetActivity, signOutAndRedirect, router])

  const mins = warnSecondsLeft !== null ? Math.floor(warnSecondsLeft / 60) : 0
  const secs = warnSecondsLeft !== null ? warnSecondsLeft % 60 : 0
  const countdown = `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <>
      {children}
      <AnimatePresence>
        {warnSecondsLeft !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl"
            >
              <div className="mb-2 text-4xl font-bold tabular-nums tracking-tight text-foreground">
                {countdown}
              </div>
              <h2 className="mb-1 text-lg font-semibold text-foreground">
                Still there?
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                For your security, you&apos;ll be signed out due to inactivity. Move your mouse or press a key to stay signed in.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={resetActivity}
                  className="flex-1 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Stay signed in
                </button>
                <button
                  onClick={signOutAndRedirect}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
