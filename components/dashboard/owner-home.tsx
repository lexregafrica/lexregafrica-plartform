'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AnalyticsDashboard,
  type AnalyticsDashboardData,
  type AnalyticsDashboardPage,
  type AnalyticsPullRequest,
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

// LexReg AI in the matter panel: answers from that entity's records only.
const askLexReg = async (question: string, matter: AnalyticsPullRequest) => {
  if (!matter.entityId) return 'This matter is not linked to an entity, so LexReg AI cannot look it up.'
  const res = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityId: matter.entityId, question, matter: matter.title }),
  })
  const body = (await res.json().catch(() => ({}))) as { answer?: string; error?: string }
  return body.answer ?? body.error ?? 'LexReg AI could not answer right now.'
}

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
      onAsk={askLexReg}
    />
  )
}
