import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Building2, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Entities' }

const STATUS_DISPLAY = {
  draft: { label: 'Draft', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  pending_registration: { label: 'Pending Registration', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  active: { label: 'Active', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  suspended: { label: 'Suspended', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  dissolved: { label: 'Dissolved', icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
} as const

const ENTITY_TYPE_LABELS: Record<string, string> = {
  limited_company: 'Limited Company',
  public_limited_company: 'Public Limited Company',
  limited_liability_partnership: 'LLP',
  sole_proprietorship: 'Sole Proprietorship',
  partnership: 'Partnership',
  company_limited_by_guarantee: 'CLG',
  foreign_branch: 'Foreign Branch',
  cooperative: 'Cooperative',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entities } = await supabase
    .from('entities')
    .select('id, legal_name, trading_name, entity_type, status, registration_number, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const isEmpty = !entities || entities.length === 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-navy)' }}>
            Your Entities
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEmpty ? 'No entities yet — add your first one below' : `${entities.length} registered`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/onboarding">
            <Plus className="size-4" />
            Add entity
          </Link>
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => {
            const status = STATUS_DISPLAY[entity.status as keyof typeof STATUS_DISPLAY] ?? STATUS_DISPLAY.draft
            const StatusIcon = status.icon
            return (
              <Link
                key={entity.id}
                href={`/entities/${entity.id}`}
                className="group block rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--brand-navy)' }}
                  >
                    <Building2 className="size-5 text-white" />
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="size-3" />
                    {status.label}
                  </span>
                </div>

                <h3 className="font-semibold text-sm leading-snug group-hover:underline" style={{ color: 'var(--brand-navy)' }}>
                  {entity.legal_name ?? entity.trading_name ?? 'Unnamed entity'}
                </h3>
                {entity.trading_name && entity.legal_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entity.trading_name}</p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {ENTITY_TYPE_LABELS[entity.entity_type] ?? entity.entity_type}
                  </Badge>
                  {entity.registration_number && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {entity.registration_number}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white py-20 px-8 text-center">
      <div
        className="size-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'var(--brand-navy)' }}
      >
        <Building2 className="size-8 text-white" />
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--brand-navy)' }}>
        No entities yet
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Add your first business entity to start tracking compliance, documents, and governance.
      </p>
      <Button asChild>
        <Link href="/onboarding">
          <Plus className="size-4" />
          Add your first entity
        </Link>
      </Button>
    </div>
  )
}
