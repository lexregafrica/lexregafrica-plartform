import Link from 'next/link'
import { IconChevronRight } from '@tabler/icons-react'
import type { EditorReport } from '@/components/ai/report-editor'

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })

export function ReportList({ reports, base, empty }: { reports: EditorReport[]; base: string; empty: string }) {
  if (!reports.length) return <p className="t-footnote t-3 px-5 pb-5">{empty}</p>
  return (
    <ul className="flex flex-col px-2 pb-2">
      {reports.map((r) => {
        const gaps = r.findings.filter((f) => f.status === 'gap').length
        return (
          <li key={r.id}>
            <Link href={`${base}/${r.id}`} className="list-row is-link" style={{ color: 'var(--label)' }}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="t-subhead truncate" style={{ fontWeight: 600 }}>{r.entityName}</span>
                <span className="t-footnote t-3">{r.status === 'released' ? `Signed ${fmt(r.signedAt ?? r.createdAt)}` : `Drafted ${fmt(r.createdAt)}`} · {gaps} gap{gaps === 1 ? '' : 's'}</span>
              </span>
              <span className={`pill ${r.status === 'released' ? 'pill-good' : r.status === 'rejected' ? 'pill-bad' : 'pill-warn'}`}>
                {r.status === 'released' ? 'Released' : r.status === 'rejected' ? 'Rejected' : 'Awaiting sign-off'}
              </span>
              <IconChevronRight size={16} stroke={2} aria-hidden="true" className="chev" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
