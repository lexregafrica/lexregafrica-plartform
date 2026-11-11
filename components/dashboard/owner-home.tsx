'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AnalyticsDashboard,
  type AnalyticsDashboardData,
  type AnalyticsDashboardPage,
  type AnalyticsSettings,
} from '@/components/block/analytics-dashboard'

// Dashboard, Entities, Matters and Settings: the analytics block's pages,
// embedded in the owner frame. Each page has its own URL.

const HREF: Record<AnalyticsDashboardPage, string> = {
  overview: '/dashboard',
  repositories: '/dashboard/entities',
  reviews: '/dashboard/matters',
  settings: '/dashboard/settings',
}

// Phase C wires LexReg AI here. Until then the panel says so plainly.
const askNotReady = async () =>
  'LexReg AI is not switched on yet. For help with this matter, contact the LexReg team from Services.'

export function OwnerHome({
  page,
  data,
  user,
  settings,
}: {
  page: AnalyticsDashboardPage
  data: AnalyticsDashboardData
  user: { name: string; email: string; role: string }
  settings?: Partial<AnalyticsSettings>
}) {
  const router = useRouter()

  const saveSettings = useCallback(
    async (next: AnalyticsSettings) => {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error('save failed')
      router.refresh()
    },
    [router],
  )

  return (
    <AnalyticsDashboard
      embedded
      variant="fill"
      page={page}
      onPageChange={(next) => router.push(HREF[next])}
      data={data}
      user={{ name: user.name, email: user.email, avatar: '', role: user.role }}
      defaultAccent={settings?.accent ?? 'burgundy'}
      initialSettings={settings}
      onSaveSettings={saveSettings}
      emailLocked
      onAsk={askNotReady}
    />
  )
}
