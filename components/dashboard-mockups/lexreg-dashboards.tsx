'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Briefcase, Building2, CalendarCheck, Download, FolderOpen, LayoutDashboard, LifeBuoy, Plus, Scale, Search, Settings, Sparkles } from 'lucide-react'
import { DashboardButton, DashboardFilterMenu, DashboardShell, type DashboardShellNavSection } from '@/components/block/dashboard-shell'
import { AnalyticsDashboard, analyticsDashboardDemoData, type AnalyticsDashboardPage } from '@/components/block/analytics-dashboard'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

// Dashboard revamp mockups — Obsidian UI blocks with LexReg colours and
// sample LexReg content only. No data is read or saved.

const BRAND = { name: 'LexReg', description: 'Africa', logo: <LexRegLogoMark size={22} /> }

const ENTITY_DOTS = analyticsDashboardDemoData.repositories.slice(0, 3).map((r) => ({
  id: `entity-${r.name}`,
  label: r.name.split('/')[1] ?? r.name,
  color: r.languageColor,
}))

function HeaderActions() {
  return (
    <>
      <DashboardButton variant="ghost" size="icon" aria-label="Search"><Search aria-hidden /></DashboardButton>
      <DashboardButton variant="ghost" size="icon" aria-label="Notifications"><Bell aria-hidden /></DashboardButton>
      <span aria-label="Wanjiku Mwangi" className="grid size-[30px] place-items-center rounded-full bg-[#1A1A2E] text-[11px] font-semibold text-white">WM</span>
    </>
  )
}

function AuditCard() {
  return (
    <div className="m-3 flex flex-col gap-2 rounded-lg border border-(--obsidian-dashboard-shell-border) p-3">
      <p className="text-sm font-medium">Legal audit</p>
      <p className="text-xs text-(--obsidian-dashboard-shell-text-muted)">Lawyer-signed report on your records. KES 25,000.</p>
      <DashboardButton variant="primary" className="self-start">Request audit</DashboardButton>
    </div>
  )
}

/* ───────────── 1. Dashboard shell, as-is ───────────── */

const SHELL_NAV: DashboardShellNavSection[] = [
  {
    id: 'workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'entities', label: 'Entities', icon: Building2, count: 5 },
      { id: 'matters', label: 'Matters', icon: Scale, count: 7 },
      { id: 'documents', label: 'Documents', icon: FolderOpen },
      { id: 'compliance', label: 'Compliance', icon: CalendarCheck },
      { id: 'services', label: 'Services', icon: Briefcase },
    ],
  },
  { id: 'your-entities', title: 'Your entities', items: ENTITY_DOTS },
]

const SECONDARY_NAV = [
  { id: 'ask', label: 'Ask LexReg AI', icon: Sparkles },
  { id: 'help', label: 'Help', icon: LifeBuoy },
]

const TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'Private company', label: 'Private company' },
  { value: 'Public company', label: 'Public company' },
  { value: 'LLP', label: 'LLP' },
  { value: 'Society', label: 'Society' },
  { value: 'Business name', label: 'Business name' },
]

const SORTS = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'name', label: 'Name' },
]

export function ShellMock() {
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('recent')
  const [tab, setTab] = useState('all')
  const rows = analyticsDashboardDemoData.repositories
    .filter((r) => type === 'all' || r.language === type)
    .filter((r) => tab === 'all' || (tab === 'open' ? r.openPrs > 0 : r.openPrs === 0))
    .sort((a, b) => (sort === 'name' ? a.name.split('/')[1].localeCompare(b.name.split('/')[1]) : a.updatedMinutes - b.updatedMinutes))

  return (
    <div className="h-[100dvh]">
      <DashboardShell
        brand={BRAND}
        navigation={SHELL_NAV}
        secondaryNavigation={SECONDARY_NAV}
        sidebarFooter={<AuditCard />}
        defaultActiveItemId="entities"
        title="Entities"
        status="All filings current"
        statusTone="success"
        headerActions={<HeaderActions />}
        tabs={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open matters' }, { value: 'clear', label: 'Nothing open' }]}
        tab={tab}
        onTabChange={setTab}
        filters={<><DashboardFilterMenu label="Type" value={type} options={TYPES} onValueChange={setType} /><DashboardFilterMenu label="Sort by" value={sort} options={SORTS} onValueChange={setSort} /></>}
        toolbarActions={<><DashboardButton variant="ghost"><Download aria-hidden />Export</DashboardButton><DashboardButton variant="primary"><Plus aria-hidden />New entity</DashboardButton></>}
        linkComponent={Link}
      >
        <div className="overflow-x-auto px-4 pb-6">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-(--obsidian-dashboard-shell-text-subtle)">
                {['Entity', 'Type', 'Documents', 'Open matters', 'Updated'].map((h) => (
                  <th key={h} scope="col" className="border-b border-(--obsidian-dashboard-shell-border) px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const [reg, name] = r.name.split('/')
                return (
                  <tr key={r.name} className="hover:bg-(--obsidian-dashboard-shell-hover)">
                    <td className="border-b border-(--obsidian-dashboard-shell-border) px-3 py-2.5">
                      <span className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-(--obsidian-dashboard-shell-text-subtle)">{reg}</span>
                      </span>
                    </td>
                    <td className="border-b border-(--obsidian-dashboard-shell-border) px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: r.languageColor }} aria-hidden />{r.language}</span>
                    </td>
                    <td className="border-b border-(--obsidian-dashboard-shell-border) px-3 py-2.5 tabular-nums">{r.stars}</td>
                    <td className="border-b border-(--obsidian-dashboard-shell-border) px-3 py-2.5 tabular-nums">
                      {r.openPrs > 0 ? <span className="text-(--obsidian-dashboard-shell-warning)">{r.openPrs} open</span> : <span className="text-(--obsidian-dashboard-shell-text-subtle)">None</span>}
                    </td>
                    <td className="border-b border-(--obsidian-dashboard-shell-border) px-3 py-2.5 text-(--obsidian-dashboard-shell-text-muted)">{r.updated}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    </div>
  )
}

/* ───────────── 2. Analytics dashboard, as-is ───────────── */

export function AnalyticsMock() {
  return (
    <div className="h-[100dvh]">
      <AnalyticsDashboard variant="fill" brand={{ name: 'LexReg', logo: <LexRegLogoMark size={21} /> }} />
    </div>
  )
}

/* ───────────── 3. Combined: shell navigation + analytics pages + AI panel ───────────── */

const PAGE_FOR: Record<string, AnalyticsDashboardPage> = {
  dashboard: 'overview',
  entities: 'repositories',
  matters: 'reviews',
  settings: 'settings',
}

const TITLE_FOR: Record<AnalyticsDashboardPage, string> = {
  overview: 'Dashboard',
  repositories: 'Entities',
  reviews: 'Matters',
  settings: 'Settings',
}

const COMBINED_NAV: DashboardShellNavSection[] = [
  {
    id: 'workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'entities', label: 'Entities', icon: Building2, count: 5 },
      { id: 'matters', label: 'Matters', icon: Scale, count: 6 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  { id: 'your-entities', title: 'Your entities', items: ENTITY_DOTS },
]

/** The combined dashboard with sample data. `className` sets the frame
 *  (full screen in /mockups; a fixed-height window on the landing page). */
export function CombinedMock({ className = 'h-[100dvh]', docked = false }: { className?: string; docked?: boolean } = {}) {
  const [page, setPage] = useState<AnalyticsDashboardPage>('overview')
  const activeId = Object.keys(PAGE_FOR).find((k) => PAGE_FOR[k] === page) ?? 'dashboard'

  return (
    <div className={className}>
      <DashboardShell
        brand={BRAND}
        navigation={COMBINED_NAV}
        secondaryNavigation={[{ id: 'help', label: 'Help', icon: LifeBuoy }]}
        sidebarFooter={<AuditCard />}
        activeItemId={activeId}
        onActiveItemChange={(id) => setPage(PAGE_FOR[id] ?? 'repositories')}
        title={TITLE_FOR[page]}
        headerActions={<HeaderActions />}
      >
        <AnalyticsDashboard embedded docked={docked} variant="fill" page={page} onPageChange={setPage} />
      </DashboardShell>
    </div>
  )
}
