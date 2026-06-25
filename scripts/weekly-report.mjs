#!/usr/bin/env node
/**
 * LexReg Weekly Progress Report Generator
 * Reads git log for the past 7 days and generates a branded PDF report for Charles.
 * Run manually: node scripts/weekly-report.mjs
 * Or via cron (see scripts/README.md)
 */

import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Config ──────────────────────────────────────────────────
const BRAND = {
  navy: '#1a1a2e',
  gold: '#c9a227',
  lightGray: '#f3f4f6',
  textGray: '#374151',
  mutedGray: '#6b7280',
}

const WEEK_NUMBER = getWeekNumber(new Date())
const REPORT_DATE = new Date().toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
})
const DATE_SLUG = new Date().toISOString().slice(0, 10)
const OUTPUT_DIR = join(ROOT, 'reports')
const OUTPUT_FILE = join(OUTPUT_DIR, `week-${WEEK_NUMBER}-${DATE_SLUG}.html`)

// ── Gather data ──────────────────────────────────────────────
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function getGitLog(days = 7) {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const log = execSync(
      `git -C "${ROOT}" log --since="${since}" --pretty=format:"%H|%s|%an|%ad" --date=short`,
      { encoding: 'utf8' }
    ).trim()
    if (!log) return []
    return log.split('\n').map(line => {
      const [hash, subject, author, date] = line.split('|')
      return { hash: hash.slice(0, 7), subject, author, date }
    })
  } catch {
    return []
  }
}

function categoriseCommit(subject) {
  const s = subject.toLowerCase()
  if (s.includes('auth') || s.includes('login') || s.includes('signup')) return 'Auth & Security'
  if (s.includes('entity') || s.includes('onboarding')) return 'Entity Management'
  if (s.includes('document') || s.includes('vault') || s.includes('ocr')) return 'Document Vault'
  if (s.includes('compliance') || s.includes('calendar')) return 'Compliance Calendar'
  if (s.includes('dashboard') || s.includes('ui') || s.includes('component')) return 'UI / Dashboard'
  if (s.includes('schema') || s.includes('migration') || s.includes('database')) return 'Database'
  if (s.includes('lawyer') || s.includes('legal') || s.includes('audit')) return 'Legal Services'
  if (s.includes('payment') || s.includes('paystack')) return 'Payments'
  if (s.includes('fix') || s.includes('bug')) return 'Bug Fixes'
  return 'General'
}

function groupByCategory(commits) {
  return commits.reduce((acc, commit) => {
    const cat = categoriseCommit(commit.subject)
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(commit)
    return acc
  }, {})
}

// Upcoming work — edit this section each week or load from prd.json
function getUpcomingWork() {
  try {
    const prdPath = join(ROOT, 'prd.json')
    if (existsSync(prdPath)) {
      const prd = JSON.parse(execSync(`cat "${prdPath}"`, { encoding: 'utf8' }))
      const pending = (prd.userStories || []).filter(s => !s.passes).slice(0, 6)
      return pending.map(s => s.title || s.description || 'Untitled story')
    }
  } catch {}
  return [
    'Complete entity onboarding — Path 1 (existing registered entity)',
    'Build document vault upload and preview',
    'Set up compliance calendar with recurring events',
    'Wire up Supabase auth (email + Google OAuth)',
    'Build home dashboard with entity cards',
    'Set up lawyer invite flow',
  ]
}

// ── Build HTML report ────────────────────────────────────────
function buildReport(commits, upcomingWork) {
  const grouped = groupByCategory(commits)
  const totalCommits = commits.length

  const categorySections = Object.entries(grouped).map(([cat, items]) => `
    <div class="category">
      <div class="category-header">${cat}</div>
      <ul class="commit-list">
        ${items.map(c => `
          <li>
            <span class="commit-hash">${c.hash}</span>
            <span class="commit-subject">${c.subject}</span>
            <span class="commit-date">${c.date}</span>
          </li>`).join('')}
      </ul>
    </div>`).join('')

  const upcomingList = upcomingWork.map((item, i) =>
    `<li><span class="item-num">${i + 1}</span>${item}</li>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LexReg Weekly Progress Report — Week ${WEEK_NUMBER}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 14px;
      color: ${BRAND.textGray};
      background: #fff;
      padding: 48px;
      max-width: 900px;
      margin: 0 auto;
    }

    /* Cover */
    .cover {
      background: ${BRAND.navy};
      color: #fff;
      padding: 48px;
      border-radius: 12px;
      margin-bottom: 40px;
    }
    .cover-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${BRAND.gold};
      margin-bottom: 16px;
    }
    .cover h1 {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .cover-sub {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 32px;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 24px;
    }
    .meta-item label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.5);
      display: block;
      margin-bottom: 4px;
    }
    .meta-item span {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    /* Stat row */
    .stat-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: ${BRAND.lightGray};
      border-radius: 8px;
      padding: 20px 24px;
    }
    .stat-card .num {
      font-size: 28px;
      font-weight: 700;
      color: ${BRAND.navy};
    }
    .stat-card .lbl {
      font-size: 12px;
      color: ${BRAND.mutedGray};
      margin-top: 4px;
    }

    /* Section */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${BRAND.mutedGray};
      border-bottom: 2px solid ${BRAND.gold};
      padding-bottom: 8px;
      margin-bottom: 20px;
    }

    /* Categories */
    .category { margin-bottom: 24px; }
    .category-header {
      font-size: 12px;
      font-weight: 600;
      color: ${BRAND.navy};
      background: ${BRAND.lightGray};
      padding: 6px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .commit-list { list-style: none; padding: 0 4px; }
    .commit-list li {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 5px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .commit-hash {
      font-family: monospace;
      font-size: 11px;
      color: ${BRAND.gold};
      background: #fffbeb;
      padding: 1px 5px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .commit-subject { flex: 1; }
    .commit-date { font-size: 11px; color: ${BRAND.mutedGray}; flex-shrink: 0; }

    /* Upcoming */
    .upcoming-list { list-style: none; }
    .upcoming-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .item-num {
      width: 22px;
      height: 22px;
      background: ${BRAND.navy};
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* Empty state */
    .empty {
      text-align: center;
      padding: 32px;
      color: ${BRAND.mutedGray};
      background: ${BRAND.lightGray};
      border-radius: 8px;
    }

    /* Footer */
    .footer {
      margin-top: 48px;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: ${BRAND.mutedGray};
    }
    .footer strong { color: ${BRAND.navy}; }

    @media print {
      body { padding: 24px; }
    }
  </style>
</head>
<body>

  <div class="cover">
    <div class="cover-label">Weekly Progress Report</div>
    <h1>LexReg Africa<br>Development Update</h1>
    <div class="cover-sub">Governance, Compliance & Organisational Readiness OS</div>
    <div class="cover-meta">
      <div class="meta-item">
        <label>Week</label>
        <span>Week ${WEEK_NUMBER}</span>
      </div>
      <div class="meta-item">
        <label>Report Date</label>
        <span>${REPORT_DATE}</span>
      </div>
      <div class="meta-item">
        <label>Prepared By</label>
        <span>Ian Love</span>
      </div>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-card">
      <div class="num">${totalCommits}</div>
      <div class="lbl">Commits this week</div>
    </div>
    <div class="stat-card">
      <div class="num">${Object.keys(grouped).length}</div>
      <div class="lbl">Areas touched</div>
    </div>
    <div class="stat-card">
      <div class="num">${upcomingWork.length}</div>
      <div class="lbl">Items planned next week</div>
    </div>
  </div>

  <div class="section-title" style="margin-bottom:24px">What We Built This Week</div>

  ${totalCommits === 0
    ? '<div class="empty">No commits recorded this week.</div>'
    : categorySections
  }

  <div style="margin-top:40px">
    <div class="section-title" style="margin-bottom:20px">Planned For Next Week</div>
    <ul class="upcoming-list">
      ${upcomingList}
    </ul>
  </div>

  <div class="footer">
    <span><strong>LexReg Africa</strong> · Confidential · For Charles's review only</span>
    <span>Generated ${REPORT_DATE}</span>
  </div>

</body>
</html>`
}

// ── Run ──────────────────────────────────────────────────────
console.log('📋 LexReg Weekly Report Generator')
console.log(`   Week ${WEEK_NUMBER} · ${REPORT_DATE}\n`)

const commits = getGitLog(7)
const upcomingWork = getUpcomingWork()

console.log(`   Found ${commits.length} commits in the past 7 days`)

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

const html = buildReport(commits, upcomingWork)
writeFileSync(OUTPUT_FILE, html, 'utf8')

console.log(`\n✅ Report saved to: reports/week-${WEEK_NUMBER}-${DATE_SLUG}.html`)
console.log('   Open in browser and use File → Print → Save as PDF to generate PDF')
console.log('   (Or install wkhtmltopdf/puppeteer for automated PDF generation)\n')
