// Information Document Package (IDP) generator.
// Not an official BRS form (CR1/CR2/CR8 templates need Charles's sign-off
// before we can render those) — this is a clean summary of everything
// collected, meant to be copied into the BRS eCitizen portal, or handed
// to a lawyer/LexReg for assisted filing.
//
// pdf-lib over reportlab here deliberately: this runs inside a Vercel
// serverless function at request time, where a Python runtime isn't
// available. reportlab stays the right tool for the locally-run
// marketing/audit report scripts (generate_brand.py, generate_audit.py).

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'

// Formal black/gray palette — this document sits alongside real BRS
// filings (CR1/CR2/CR8), so it reads as a plain reference document, not
// branded marketing collateral.
const BLACK = rgb(0.06, 0.06, 0.08)
const GRAY = rgb(0.4, 0.4, 0.42)
const RULE_GRAY = rgb(0.75, 0.75, 0.75)
const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const MARGIN = 56

export type IdpDirector = { fullName: string; idNumber: string; kraPin: string | null; role?: string }
export type IdpShareholder = { legalName: string; sharesHeld: number; sharePercentage: number | null }

export type IdpInput = {
  entityTypeLabel: string
  legalNameOptions: string[]
  natureOfBusiness: string | null
  registeredAddress: { line1: string | null; city: string | null; county: string | null; postcode: string | null } | null
  nominalCapital: number | null
  totalShares: number | null
  directors: IdpDirector[]
  shareholders: IdpShareholder[]
  applicantName: string | null
  applicantEmail: string | null
  applicantRelationship: string | null
  organisationName: string
  generatedAt: Date
}

export async function generateIdp(input: IdpInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold)

  const ctx = new PageBuilder(doc, font, bold)

  ctx.title('INFORMATION DOCUMENT PACKAGE')
  ctx.subtitle(`Prepared for ${input.organisationName}  ·  ${formatDate(input.generatedAt)}`)
  ctx.rule(true)

  ctx.notice(
    'This document summarises the information you provided to LexReg Africa. It is not an official BRS ' +
    'form. Use it as a reference when filing on the BRS eCitizen portal, or hand it to your LexReg ' +
    'representative for assisted or lawyer-assisted filing.'
  )

  ctx.section('Entity Overview')
  ctx.field('Entity type', input.entityTypeLabel)
  ctx.field('Proposed names', input.legalNameOptions.filter(Boolean).join('  •  ') || '—')
  ctx.field('Nature of business', input.natureOfBusiness ?? '—')

  ctx.section('Registered Office')
  if (input.registeredAddress) {
    const a = input.registeredAddress
    ctx.field('Address', [a.line1, a.city, a.county, a.postcode].filter(Boolean).join(', ') || '—')
  } else {
    ctx.field('Address', '—')
  }

  if (input.directors.length > 0) {
    ctx.section('Directors / Partners')
    for (const d of input.directors) {
      ctx.personRow(d.fullName, [d.idNumber && `ID ${d.idNumber}`, d.kraPin && `PIN ${d.kraPin}`].filter(Boolean).join('  ·  '))
    }
  }

  if (input.shareholders.length > 0) {
    ctx.section('Shareholders')
    for (const s of input.shareholders) {
      ctx.personRow(
        s.legalName,
        [`${s.sharesHeld.toLocaleString()} shares`, s.sharePercentage != null && `${s.sharePercentage}%`].filter(Boolean).join('  ·  ')
      )
    }
  }

  if (input.nominalCapital != null || input.totalShares != null) {
    ctx.section('Share Capital')
    if (input.totalShares != null) ctx.field('Total shares issued', input.totalShares.toLocaleString())
    if (input.nominalCapital != null) ctx.field('Authorised capital', `KES ${input.nominalCapital.toLocaleString()}`)
  }

  ctx.section('Applicant Declaration')
  ctx.field('Signed by', input.applicantName ?? '—')
  ctx.field('Relationship to business', input.applicantRelationship ?? '—')
  ctx.field('Contact email', input.applicantEmail ?? '—')

  ctx.section('Next Steps')
  ctx.bullet('Self-service: file this package yourself on the BRS eCitizen portal.')
  ctx.bullet('Assisted service: request LexReg Africa to handle BRS filing on your behalf.')
  ctx.bullet('Lawyer-assisted: a LexReg Africa lawyer reviews and files for you.')
  ctx.bullet('Once BRS issues your certificate of incorporation, upload it back on your dashboard to activate your entity.')

  return doc.save()
}

// ------------------------------------------------------------------
// Minimal page-flow helper — new page when content runs out of room.
// ------------------------------------------------------------------
class PageBuilder {
  private doc: PDFDocument
  private font: PDFFont
  private bold: PDFFont
  private page: PDFPage
  private y: number

  constructor(doc: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.doc = doc
    this.font = font
    this.bold = bold
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.y = PAGE_HEIGHT - MARGIN
  }

  private ensureRoom(needed: number) {
    if (this.y - needed < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      this.y = PAGE_HEIGHT - MARGIN
    }
  }

  title(text: string) {
    this.ensureRoom(30)
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 18, font: this.bold, color: BLACK })
    this.y -= 26
  }

  subtitle(text: string) {
    this.ensureRoom(20)
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 10, font: this.font, color: GRAY })
    this.y -= 20
  }

  // `emphasis` draws a heavier rule under the document header; section
  // dividers use the lighter default.
  rule(emphasis = false) {
    this.ensureRoom(16)
    this.page.drawLine({
      start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: emphasis ? 1.2 : 0.6, color: emphasis ? BLACK : RULE_GRAY,
    })
    this.y -= 20
  }

  notice(text: string) {
    const lines = wrapText(text, this.font, 9, PAGE_WIDTH - MARGIN * 2)
    this.ensureRoom(lines.length * 13 + 14)
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 9, font: this.font, color: GRAY })
      this.y -= 13
    }
    this.y -= 12
  }

  section(text: string) {
    this.ensureRoom(28)
    this.page.drawText(text.toUpperCase(), { x: MARGIN, y: this.y, size: 10.5, font: this.bold, color: BLACK })
    this.y -= 6
    this.page.drawLine({
      start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.6, color: RULE_GRAY,
    })
    this.y -= 16
  }

  field(label: string, value: string) {
    this.ensureRoom(16)
    this.page.drawText(label, { x: MARGIN, y: this.y, size: 9.5, font: this.font, color: GRAY })
    this.page.drawText(value, { x: MARGIN + 160, y: this.y, size: 9.5, font: this.font, color: BLACK })
    this.y -= 16
  }

  personRow(name: string, detail: string) {
    this.ensureRoom(16)
    this.page.drawText(name, { x: MARGIN, y: this.y, size: 9.5, font: this.bold, color: BLACK })
    this.page.drawText(detail, { x: MARGIN + 200, y: this.y, size: 9, font: this.font, color: GRAY })
    this.y -= 15
  }

  bullet(text: string) {
    const lines = wrapText(text, this.font, 9.5, PAGE_WIDTH - MARGIN * 2 - 14)
    this.ensureRoom(lines.length * 13 + 4)
    this.page.drawText('•', { x: MARGIN, y: this.y, size: 9.5, font: this.bold, color: BLACK })
    for (const [i, line] of lines.entries()) {
      this.page.drawText(line, { x: MARGIN + 14, y: this.y - i * 13, size: 9.5, font: this.font, color: BLACK })
    }
    this.y -= lines.length * 13 + 4
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = trial
    }
  }
  if (current) lines.push(current)
  return lines
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
}
