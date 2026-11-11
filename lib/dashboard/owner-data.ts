import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type {
  AnalyticsActivity,
  AnalyticsDashboardData,
  AnalyticsKpi,
  AnalyticsPerson,
  AnalyticsPullRequest,
  AnalyticsRepository,
} from '@/components/block/analytics-dashboard'
import { ENTITY_TYPES, missingRequiredDocuments, type EntityType } from '@/lib/onboarding/new-entity'

// Maps LexReg records onto the analytics block's data shape:
//   repositories → entities, pull requests → matters
//   (compliance deadlines + lawyer assignments), commits → logged actions.
// Every query runs on the user's own session, so RLS decides what is seen.

const DAY = 86_400_000
const NAIROBI_OFFSET = 3 * 3_600_000 // EAT, no daylight saving

export const BRAND_COLORS = { burgundy: '#800020', gold: '#C9A227', navy: '#1A1A2E' }

const TYPE_COLORS: Record<string, string> = {
  limited_company: '#800020',
  public_limited_company: '#5b6475',
  limited_liability_partnership: '#C9A227',
  company_limited_by_guarantee: '#9a1a35',
  society: '#1A1A2E',
  trust: '#3d4a5c',
  business_name: '#8a8f98',
}

/** Owner view of lawyer assignments (migration 20261111000001). Untyped until
 *  `npm run db:types` is re-run after the migration is pushed. */
export function fetchOwnerLawyers(supabase: unknown) {
  return (supabase as SupabaseClient).rpc('owner_entity_lawyers')
}

export const entityTypeColor = (type: string) => TYPE_COLORS[type] ?? '#8a8f98'

const SERVICE_LABELS: Record<string, string> = {
  legal_audit: 'Legal audit',
  corporate_services: 'Corporate services',
}

const CATEGORY_APPROACH: Record<string, string> = {
  annual_return: 'LexReg prepares the return from your registers. You file it on BRS eCitizen and upload the acknowledgement here.',
  bo_update: 'LexReg prepares the beneficial ownership form from your register for signature. You lodge it on BRS and upload the acknowledgement.',
  register_maintenance: 'LexReg updates the statutory register from the records on file and flags anything that needs a signature.',
  tax: 'Your tax agent files with KRA. Upload the acknowledgement here so the record stays complete.',
  license: 'Renew with the issuing authority and upload the new licence here.',
}
const DEFAULT_APPROACH = 'LexReg tracks this deadline and reminds you before it is due. Upload the evidence here once it is done.'

export type OwnerDashboard = { data: AnalyticsDashboardData }

type EntityRow = {
  id: string
  legal_name: string | null
  trading_name: string | null
  proposed_names: unknown
  entity_type: string
  status: string
  registration_number: string | null
  updated_at: string | null
  created_at: string
}

export function entityDisplayName(e: { legal_name: string | null; trading_name: string | null; proposed_names: unknown }) {
  return e.legal_name || e.trading_name || (e.proposed_names as string[] | null)?.find((n) => n?.trim()) || 'Unnamed entity'
}

export function entityTypeLabel(value: string) {
  return ENTITY_TYPES.find((t) => t.value === value)?.label ?? (value === 'foreign_branch' ? 'Foreign Branch' : value)
}

const STATUS_TEXT: Record<string, string> = {
  draft: 'Onboarding in progress',
  pending_registration: 'Awaiting BRS certificate',
  active: 'Registered',
}

function relative(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60_000))
  if (mins < 60) return `${Math.max(1, mins)}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.round(days / 30)}mo`
}

const fmtDate = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
const fmtShort = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })
const fmtWeekday = new Intl.DateTimeFormat('en-KE', { weekday: 'short', timeZone: 'Africa/Nairobi' })
const fmtCaption = new Intl.DateTimeFormat('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })

/** Start of today in Nairobi, as a UTC timestamp. */
function startOfNairobiDay(now: number) {
  return Math.floor((now + NAIROBI_OFFSET) / DAY) * DAY - NAIROBI_OFFSET
}

type Range = { id: string; label: string; caption: string; start: number; end: number; buckets: { label: string; start: number; end: number }[] }

function buildRanges(now: number): Range[] {
  const today = startOfNairobiDay(now)
  const todayBuckets = [0, 4, 8, 12, 16, 20].map((h) => ({
    label: h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`,
    start: today + h * 3_600_000,
    end: today + (h + 4) * 3_600_000,
  }))
  const weekStart = today - 6 * DAY
  const weekBuckets = Array.from({ length: 7 }, (_, i) => ({ label: fmtWeekday.format(weekStart + i * DAY), start: weekStart + i * DAY, end: weekStart + (i + 1) * DAY }))
  const monthStart = today - 27 * DAY
  const monthBuckets = Array.from({ length: 4 }, (_, i) => ({ label: fmtShort.format(monthStart + i * 7 * DAY), start: monthStart + i * 7 * DAY, end: monthStart + (i + 1) * 7 * DAY }))
  return [
    { id: 'today', label: 'Today', caption: `${fmtCaption.format(now)} · so far`, start: today, end: today + DAY, buckets: todayBuckets },
    { id: 'week', label: 'Week', caption: `${fmtShort.format(weekStart)} – ${fmtDate.format(now)}`, start: weekStart, end: today + DAY, buckets: weekBuckets },
    { id: 'month', label: 'Month', caption: `${fmtShort.format(monthStart)} – ${fmtDate.format(now)}`, start: monthStart, end: today + DAY, buckets: monthBuckets },
  ]
}

const inRange = (t: number, start: number, end: number) => t >= start && t < end

/** Percent change against the period before; 0 when there is nothing to compare with. */
function delta(current: number, previous: number) {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}

function spark(times: number[], start: number, end: number, points = 10) {
  const step = (end - start) / points
  return Array.from({ length: points }, (_, i) => times.filter((t) => inRange(t, start + i * step, start + (i + 1) * step)).length)
}

export async function loadOwnerDashboard(supabase: SupabaseClient, user: User, orgId: string, entities: EntityRow[], role: string): Promise<OwnerDashboard> {
  const now = Date.now()
  const since = now - 60 * DAY
  const entityIds = entities.map((e) => e.id)

  const [{ data: docs }, { data: events }, { data: logs }, { data: lawyers }] = await Promise.all([
    supabase.from('documents').select('entity_id, document_type, created_at, uploaded_by').in('entity_id', entityIds).is('deleted_at', null),
    supabase
      .from('compliance_events')
      .select('id, entity_id, title, description, category, due_date, status, notes, created_at, completed_at, completed_by')
      .in('entity_id', entityIds)
      .order('due_date'),
    supabase
      .from('audit_logs')
      .select('user_id, action, resource_id, created_at')
      .eq('organisation_id', orgId)
      .gte('created_at', new Date(since).toISOString())
      .order('created_at', { ascending: false })
      .limit(5000),
    // Owners: migration 20261111000001 (until applied this errors and
    // matters show deadlines only). Lawyers read their own rows directly.
    role === 'lawyer'
      ? supabase
          .from('lawyer_assignments')
          .select('assignment_id:id, entity_id, service_type, status, assigned_at, completed_at')
          .eq('lawyer_user_id', user.id)
          .neq('status', 'cancelled')
          .then((r) => ({ ...r, data: (r.data ?? []).map((a) => ({ ...a, lawyer_name: (user.user_metadata?.full_name as string | undefined) || 'You' })) }))
      : fetchOwnerLawyers(supabase),
  ])

  const ranges = buildRanges(now)

  /* ── People: you, and everyone else acting on the record (LexReg, lawyers) ── */
  const meName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'You'
  const people: AnalyticsPerson[] = [
    { handle: meName, avatar: '', color: BRAND_COLORS.burgundy, role: 'You' },
    { handle: 'LexReg', avatar: '', color: BRAND_COLORS.gold, role: 'LexReg team and lawyers' },
  ]
  const who = (userId: string | null) => (userId === user.id ? meName : 'LexReg')

  const logTimes = (logs ?? []).map((l) => ({ t: Date.parse(l.created_at), who: who(l.user_id), resource: l.resource_id as string | null }))
  const docTimes = (docs ?? []).map((d) => ({ t: Date.parse(d.created_at), entity: d.entity_id as string | null, who: who(d.uploaded_by) }))
  const completed = (events ?? []).filter((e) => e.status === 'complete' && e.completed_at)
  const doneTimes = completed.map((e) => Date.parse(e.completed_at!))

  /* ── KPIs per range ── */
  const kpis: Record<string, AnalyticsKpi[]> = {}
  const activity: Record<string, AnalyticsActivity> = {}
  for (const r of ranges) {
    const len = r.end - r.start
    const count = (ts: number[], s: number, e: number) => ts.filter((t) => inRange(t, s, e)).length
    const docT = docTimes.map((d) => d.t)
    const logT = logTimes.map((l) => l.t)
    const turnaround = (s: number, e: number) => {
      const done = completed.filter((c) => inRange(Date.parse(c.completed_at!), s, e))
      if (!done.length) return 0
      return done.reduce((sum, c) => sum + (Date.parse(c.completed_at!) - Date.parse(c.created_at)) / DAY, 0) / done.length
    }
    const ta = turnaround(r.start, r.end)
    const taPrev = turnaround(r.start - len, r.start)
    kpis[r.id] = [
      { id: 'filings', label: 'Filings done', icon: 'commit', value: String(count(doneTimes, r.start, r.end)), delta: delta(count(doneTimes, r.start, r.end), count(doneTimes, r.start - len, r.start)), spark: spark(doneTimes, r.start, r.end) },
      { id: 'documents', label: 'Documents added', icon: 'pull', value: String(count(docT, r.start, r.end)), delta: delta(count(docT, r.start, r.end), count(docT, r.start - len, r.start)), spark: spark(docT, r.start, r.end) },
      { id: 'actions', label: 'Actions logged', icon: 'merge', value: String(count(logT, r.start, r.end)), delta: delta(count(logT, r.start, r.end), count(logT, r.start - len, r.start)), spark: spark(logT, r.start, r.end) },
      { id: 'turnaround', label: 'Avg. turnaround', icon: 'clock', value: ta ? `${ta.toFixed(1)}d` : '—', delta: ta && taPrev ? delta(ta, taPrev) : 0, lowerIsBetter: true, spark: spark(completed.map((c) => Date.parse(c.completed_at!)), r.start, r.end) },
    ]

    const series: Record<string, number[]> = {}
    const lines: Record<string, { added: number; removed: number }> = {}
    for (const p of people) {
      const mine = logTimes.filter((l) => l.who === p.handle)
      series[p.handle] = r.buckets.map((b) => mine.filter((l) => inRange(l.t, b.start, b.end)).length)
      // Leaderboard badges: documents this person added, deadlines they closed
      lines[p.handle] = {
        added: docTimes.filter((d) => d.who === p.handle && inRange(d.t, r.start, r.end)).length,
        removed: completed.filter((c) => who(c.completed_by) === p.handle && inRange(Date.parse(c.completed_at!), r.start, r.end)).length,
      }
    }
    activity[r.id] = { labels: r.buckets.map((b) => b.label), series, lines }
  }

  /* ── Matters: compliance deadlines + lawyer assignments ── */
  const names = new Map(entities.map((e) => [e.id, entityDisplayName(e)]))
  const docTypesByEntity = new Map<string, Set<string>>()
  const docCount = new Map<string, number>()
  for (const d of docs ?? []) {
    if (!d.entity_id) continue
    docCount.set(d.entity_id, (docCount.get(d.entity_id) ?? 0) + 1)
    if (d.document_type) {
      const set = docTypesByEntity.get(d.entity_id) ?? new Set<string>()
      set.add(d.document_type)
      docTypesByEntity.set(d.entity_id, set)
    }
  }
  const entityById = new Map(entities.map((e) => [e.id, e]))
  const missingFor = (entityId: string) => {
    const e = entityById.get(entityId)
    if (!e || (e.status !== 'active' && e.status !== 'pending_registration')) return 0
    return missingRequiredDocuments(e.entity_type as EntityType, docTypesByEntity.get(entityId) ?? new Set()).length
  }

  type Draft = { matter: Omit<AnalyticsPullRequest, 'number'>; entityId: string; sort: number; open: boolean }
  const drafts: Draft[] = []
  const today = startOfNairobiDay(now)

  for (const ev of events ?? []) {
    const due = Date.parse(`${ev.due_date}T00:00:00+03:00`)
    const done = ev.status === 'complete'
    const overdue = !done && due < today
    const days = Math.round((due - today) / DAY)
    const label = done
      ? `Done ${relative(now - Date.parse(ev.completed_at ?? ev.created_at))} ago`
      : overdue
        ? `Overdue ${-days}d`
        : days === 0 ? 'Due today' : `Due in ${days}d`
    drafts.push({ entityId: ev.entity_id, sort: done ? Number.MAX_SAFE_INTEGER - Date.parse(ev.completed_at ?? ev.created_at) / 1000 : due, open: !done, matter: {
      title: ev.title,
      author: who(null),
      status: { kind: done ? 'merged' : 'open', label },
      repository: names.get(ev.entity_id) ?? '',
      opened: `Due ${fmtDate.format(due)}`,
      age: relative(now - Date.parse(ev.created_at)),
      today: !done && days <= 14,
      additions: docCount.get(ev.entity_id) ?? 0,
      deletions: missingFor(ev.entity_id),
      comments: ev.notes ? 1 : 0,
      problem: [ev.description || `${ev.title} for ${names.get(ev.entity_id) ?? 'this entity'}, due ${fmtDate.format(due)}.`],
      approach: [CATEGORY_APPROACH[ev.category ?? ''] ?? DEFAULT_APPROACH],
    } })
  }

  type LawyerRow = { assignment_id: string; entity_id: string; service_type: string; status: string; assigned_at: string; completed_at: string | null; lawyer_name: string }
  for (const la of ((lawyers ?? []) as LawyerRow[]).filter((l) => names.has(l.entity_id))) {
    const done = la.status === 'completed'
    const service = SERVICE_LABELS[la.service_type] ?? la.service_type
    const handle = la.lawyer_name
    if (!people.some((p) => p.handle === handle)) people.push({ handle, avatar: '', color: BRAND_COLORS.navy, role: 'Assigned lawyer' })
    drafts.push({ entityId: la.entity_id, sort: done ? Number.MAX_SAFE_INTEGER - Date.parse(la.completed_at ?? la.assigned_at) / 1000 : Date.parse(la.assigned_at) - 365 * DAY, open: !done, matter: {
      title: `${service} — ${names.get(la.entity_id)}`,
      author: handle,
      status: done ? { kind: 'merged', label: `Done ${relative(now - Date.parse(la.completed_at ?? la.assigned_at))} ago` } : { kind: 'review', label: `With lawyer · ${relative(now - Date.parse(la.assigned_at))}` },
      repository: names.get(la.entity_id) ?? '',
      opened: fmtDate.format(Date.parse(la.assigned_at)),
      age: relative(now - Date.parse(la.assigned_at)),
      today: !done,
      additions: docCount.get(la.entity_id) ?? 0,
      deletions: missingFor(la.entity_id),
      comments: 0,
      problem: [`${service} for ${names.get(la.entity_id)}. ${handle} is working from the records and documents on file.`],
      approach: ['The lawyer reviews your records and documents, then signs off. You are notified when the work is released to you.'],
    } })
  }

  drafts.sort((a, b) => a.sort - b.sort)
  const pullRequests: AnalyticsPullRequest[] = drafts.map((d, i) => ({ number: i + 1, ...d.matter, entityId: d.entityId }))
  const openByEntity = new Map<string, number>()
  for (const d of drafts) if (d.open) openByEntity.set(d.entityId, (openByEntity.get(d.entityId) ?? 0) + 1)

  /* ── Entities ── */
  const repositories: AnalyticsRepository[] = entities.map((e) => {
    const touched = [
      Date.parse(e.updated_at ?? e.created_at),
      ...docTimes.filter((d) => d.entity === e.id).map((d) => d.t),
      ...logTimes.filter((l) => l.resource === e.id).map((l) => l.t),
    ]
    const last = Math.max(...touched)
    const fourteen = today - 13 * DAY
    const daily = Array.from({ length: 14 }, (_, i) => {
      const s = fourteen + i * DAY
      return docTimes.filter((d) => d.entity === e.id && inRange(d.t, s, s + DAY)).length + logTimes.filter((l) => l.resource === e.id && inRange(l.t, s, s + DAY)).length
    })
    return {
      name: `${e.registration_number || (e.status === 'pending_registration' ? 'Pending' : 'Draft')}/${entityDisplayName(e)}`,
      description: `${entityTypeLabel(e.entity_type)} · ${STATUS_TEXT[e.status] ?? e.status}.`,
      language: entityTypeLabel(e.entity_type),
      languageColor: TYPE_COLORS[e.entity_type] ?? '#8a8f98',
      visibility: e.entity_type === 'public_limited_company' ? 'Public' : 'Private',
      openPrs: openByEntity.get(e.id) ?? 0,
      stars: docCount.get(e.id) ?? 0,
      updated: `${relative(now - last)} ago`,
      updatedMinutes: Math.round((now - last) / 60_000),
      activity: daily,
      href: `/dashboard/${e.id}`,
    }
  })

  return {
    data: {
      people,
      ranges: ranges.map(({ id, label, caption }) => ({ id, label, caption })),
      kpis,
      activity,
      repositories,
      pullRequests,
    },
  }
}
