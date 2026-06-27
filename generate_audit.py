import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime

# Brand colors
NAVY = HexColor('#1A1A2E')
GOLD = HexColor('#C9A227')
LIGHT_GRAY = HexColor('#F5F5F5')
MED_GRAY = HexColor('#737373')
DARK_GRAY = HexColor('#333333')
WHITE = white

output_dir = "/Users/ianlove/workspaces/lexreg"

# ─── STYLE DEFINITIONS ───
def make_styles():
    styles = getSampleStyleSheet()
    
    # Cover title
    styles.add(ParagraphStyle(
        'CoverTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=8,
        leading=34
    ))
    
    styles.add(ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=MED_GRAY,
        alignment=TA_CENTER,
        spaceAfter=30,
        leading=18
    ))
    
    styles.add(ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontSize=11,
        textColor=MED_GRAY,
        alignment=TA_CENTER,
        spaceAfter=6,
        leading=14
    ))
    
    styles.add(ParagraphStyle(
        'H1',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceAfter=10,
        spaceBefore=16,
        leading=20,
        borderColor=GOLD,
        borderWidth=2,
        borderPadding=4,
        leftIndent=0,
        borderRadius=0
    ))
    
    styles.add(ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=12,
        leading=16
    ))
    
    styles.add(ParagraphStyle(
        'H3',
        parent=styles['Heading3'],
        fontSize=11,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceAfter=6,
        spaceBefore=10,
        leading=14
    ))
    
    styles.add(ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_GRAY,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_GRAY,
        leading=14,
        leftIndent=18,
        bulletIndent=8,
        spaceAfter=4,
        bulletFontName='Helvetica-Bold',
        bulletColor=GOLD
    ))
    
    styles.add(ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=white,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        leading=12
    ))
    
    styles.add(ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_GRAY,
        leading=12,
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        'StatusGreen',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#059669'),
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        'StatusAmber',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#d97706'),
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        'StatusRed',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#dc2626'),
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=MED_GRAY,
        alignment=TA_CENTER
    ))
    
    return styles

def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    
    # Header line
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1.5)
    canvas.line(2.5*cm, height - 1.5*cm, width - 2.5*cm, height - 1.5*cm)
    
    # Header text
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MED_GRAY)
    canvas.drawString(2.5*cm, height - 1.2*cm, "LexReg Africa — Development Audit")
    canvas.drawRightString(width - 2.5*cm, height - 1.2*cm, f"Page {doc.page}")
    
    # Footer
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MED_GRAY)
    canvas.drawCentredString(width/2, 1.2*cm, f"Prepared for Mr. Charles | {datetime.now().strftime('%d %B %Y')} | Confidential")
    
    canvas.restoreState()

def first_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    
    # Decorative gold bar at bottom of cover
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, width, 8*mm, stroke=0, fill=1)
    
    canvas.restoreState()

def build_audit_pdf():
    styles = make_styles()
    doc = SimpleDocTemplate(
        os.path.join(output_dir, "LexReg_Development_Audit.pdf"),
        pagesize=A4,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        leftMargin=2.5*cm, rightMargin=2.5*cm
    )
    story = []
    
    # ─── COVER PAGE ───
    story.append(Spacer(1, 6*cm))
    story.append(Paragraph("LEXREG AFRICA", styles['CoverTitle']))
    story.append(Paragraph("Development Audit & Implementation Report", styles['CoverSubtitle']))
    story.append(Spacer(1, 1.5*cm))
    
    # Gold divider
    story.append(Table([['']], colWidths=[8*cm], 
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), GOLD),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ])))
    story.append(Spacer(1, 1.5*cm))
    
    story.append(Paragraph("Week of Development Review", styles['CoverMeta']))
    story.append(Paragraph(f"Report Date: {datetime.now().strftime('%d %B %Y')}", styles['CoverMeta']))
    story.append(Paragraph("Prepared for: Mr. Charles, LexReg Africa Ltd", styles['CoverMeta']))
    story.append(Paragraph("Prepared by: Ian Love Mangirwa, Lead Developer", styles['CoverMeta']))
    story.append(Paragraph("Version: 1.0 | Status: Final", styles['CoverMeta']))
    story.append(PageBreak())
    
    # ─── EXECUTIVE SUMMARY ───
    story.append(Paragraph("EXECUTIVE SUMMARY", styles['H1']))
    story.append(Paragraph(
        "This document presents a comprehensive audit of the LexReg Africa platform codebase, "
        "detailing all implemented features, architectural decisions, and the current state of "
        "development. The platform is built as a Next.js 16 application with a modern React 19 "
        "frontend, Supabase backend, and Sanity CMS for content management."
    , styles['Body']))
    story.append(Paragraph(
        "The implementation to date covers the full public-facing landing experience, a robust "
        "authentication system, onboarding path selection, a content-managed insights blog, and "
        "the foundational dashboard architecture. The design system is fully operational, grounded "
        "in an iOS 18 / Apple Business Design System philosophy with a bespoke Navy & Gold brand palette."
    , styles['Body']))
    
    # Status summary table
    story.append(Spacer(1, 8))
    status_data = [
        [Paragraph('Module', styles['TableHeader']), Paragraph('Status', styles['TableHeader']), Paragraph('Notes', styles['TableHeader'])],
        [Paragraph('Landing Page', styles['TableCell']), Paragraph('COMPLETE', styles['StatusGreen']), Paragraph('All sections implemented with animations, 3D globe, and interactive bento grid', styles['TableCell'])],
        [Paragraph('Authentication', styles['TableCell']), Paragraph('COMPLETE', styles['StatusGreen']), Paragraph('Login, signup, forgot password with Supabase Auth & cookie-based SSR', styles['TableCell'])],
        [Paragraph('Onboarding', styles['TableCell']), Paragraph('PARTIAL', styles['StatusAmber']), Paragraph('Path selection screen complete; entity-specific flows pending', styles['TableCell'])],
        [Paragraph('Dashboard', styles['TableCell']), Paragraph('SCAFFOLD', styles['StatusRed']), Paragraph('Layout shell exists; functional widgets pending', styles['TableCell'])],
        [Paragraph('CMS / Insights', styles['TableCell']), Paragraph('COMPLETE', styles['StatusGreen']), Paragraph('Sanity Studio + insights blog with placeholder fallback data', styles['TableCell'])],
        [Paragraph('Design System', styles['TableCell']), Paragraph('COMPLETE', styles['StatusGreen']), Paragraph('Full CSS tokens, iOS typography scale, 30+ custom UI components', styles['TableCell'])],
        [Paragraph('Database', styles['TableCell']), Paragraph('COMPLETE', styles['StatusGreen']), Paragraph('Supabase schema generated with TypeScript types; 20+ tables defined', styles['TableCell'])],
    ]
    status_table = Table(status_data, colWidths=[4*cm, 3*cm, 8.5*cm])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('BACKGROUND', (0,1), (-1,-1), HexColor('#fafafa')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ]))
    story.append(status_table)
    story.append(PageBreak())
    
    # ─── TECH STACK OVERVIEW ───
    story.append(Paragraph("1. TECHNOLOGY STACK & ARCHITECTURE", styles['H1']))
    story.append(Paragraph(
        "The LexReg Africa platform is architected as a modern full-stack application with clear "
        "separation between presentation, business logic, and data layers."
    , styles['Body']))
    
    story.append(Paragraph("1.1 Core Technologies", styles['H2']))
    stack_data = [
        [Paragraph('Layer', styles['TableHeader']), Paragraph('Technology', styles['TableHeader']), Paragraph('Version', styles['TableHeader']), Paragraph('Purpose', styles['TableHeader'])],
        [Paragraph('Framework', styles['TableCell']), Paragraph('Next.js', styles['TableCell']), Paragraph('16.2.9', styles['TableCell']), Paragraph('App Router, SSR, API routes, font optimization', styles['TableCell'])],
        [Paragraph('Runtime', styles['TableCell']), Paragraph('React', styles['TableCell']), Paragraph('19.2.4', styles['TableCell']), Paragraph('UI component model, concurrent features', styles['TableCell'])],
        [Paragraph('Language', styles['TableCell']), Paragraph('TypeScript', styles['TableCell']), Paragraph('5.x', styles['TableCell']), Paragraph('Type-safe development across full stack', styles['TableCell'])],
        [Paragraph('Styling', styles['TableCell']), Paragraph('Tailwind CSS', styles['TableCell']), Paragraph('4.x', styles['TableCell']), Paragraph('Utility-first CSS with custom design tokens', styles['TableCell'])],
        [Paragraph('UI Library', styles['TableCell']), Paragraph('shadcn/ui', styles['TableCell']), Paragraph('4.11.0', styles['TableCell']), Paragraph('Accessible, composable component primitives', styles['TableCell'])],
        [Paragraph('Animation', styles['TableCell']), Paragraph('Motion (Framer Motion)', styles['TableCell']), Paragraph('12.42.0', styles['TableCell']), Paragraph('Scroll-driven, gesture, and layout animations', styles['TableCell'])],
        [Paragraph('State', styles['TableCell']), Paragraph('Zustand', styles['TableCell']), Paragraph('5.0.14', styles['TableCell']), Paragraph('Lightweight global state management', styles['TableCell'])],
        [Paragraph('Backend', styles['TableCell']), Paragraph('Supabase', styles['TableCell']), Paragraph('2.108.2', styles['TableCell']), Paragraph('Auth, PostgreSQL DB, RLS, storage, Edge Functions', styles['TableCell'])],
        [Paragraph('CMS', styles['TableCell']), Paragraph('Sanity', styles['TableCell']), Paragraph('6.2.0', styles['TableCell']), Paragraph('Structured content management for insights/blog', styles['TableCell'])],
        [Paragraph('Icons', styles['TableCell']), Paragraph('Tabler Icons', styles['TableCell']), Paragraph('3.44.0', styles['TableCell']), Paragraph('Consistent, lightweight SVG icon system', styles['TableCell'])],
        [Paragraph('3D / WebGL', styles['TableCell']), Paragraph('Three.js + React Three Fiber', styles['TableCell']), Paragraph('0.185.0 / 9.6.1', styles['TableCell']), Paragraph('Interactive 3D globe visualization', styles['TableCell'])],
    ]
    stack_table = Table(stack_data, colWidths=[3.5*cm, 4.5*cm, 2.5*cm, 5*cm])
    stack_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ]))
    story.append(stack_table)
    story.append(PageBreak())
    
    # ─── IMPLEMENTED FEATURES ───
    story.append(Paragraph("2. IMPLEMENTED FEATURES — DETAILED BREAKDOWN", styles['H1']))
    
    story.append(Paragraph("2.1 Public Landing Experience", styles['H2']))
    story.append(Paragraph(
        "The landing page is a fully interactive, animation-rich single-page experience designed "
        "to communicate trust, professionalism, and regulatory expertise. It comprises seven distinct "
        "sections with a cohesive visual narrative:"
    , styles['Body']))
    story.append(ListFlowable([
        ListItem(Paragraph("<b>Hero Section</b> — Cloudscape WebGL shader background with animated sky gradient, KineticText hover-reactive headline ('Start strong. Stay compliant.'), ShimmerButton CTA with gold shimmer effect, and frosted-glass secondary CTA.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Trust Bar</b> — LogoCloud grid displaying all 8 Kenyan regulatory bodies (BRS, KRA, CAK, CMA, CBK, KEBS, ODPC, NSSF) with the 'Designed around Kenya's regulatory framework' copy.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>How It Works</b> — Scroll-driven TextReveal headline ('From idea to fully compliant entity') followed by an interactive 5-card bento grid with animated data visualizations: Registration Pipeline (SVG flow diagram), Compliance Score (animated bar charts), Task Checklist (stacked carousel), Document Vault (namespace bars + activity log), and Service Pillars (category grid).", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Services Section</b> — Three-pillar expandable layout with navigation arrows, animated pill tags, and contextual right-panel visuals: Entity Formation pipeline, Corporate Services document list, and Legal Audit checklist with progress bar.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Globe Section</b> — 3D interactive globe (Three.js + three-globe) centered on Nairobi with animated gold arcs connecting Kenya to East Africa, wider Africa, Middle East, Europe, Asia, and the Americas. Auto-rotate with atmosphere glow.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Insights Section</b> — Bento grid of 5 content cards pulling from Sanity CMS with featured article, 2 small cards, 1 tinted card, and 1 wide card. Includes category badges, read-time indicators, and hover scaling.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Footer</b> — 'Taped' card design with decorative tape SVG elements, three-column navigation (Services, Platform, Company), social links (LinkedIn, X), and legal links.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    
    story.append(Paragraph("2.2 Navigation & Global UI", styles['H2']))
    story.append(Paragraph(
        "The NotchNavbar is a custom-built fixed navigation component with a distinctive 'notch' "
        "silhouette inspired by premium hardware design. It features frosted glass (backdrop-filter) "
        "surfaces, smooth scroll anchor links, mobile hamburger menu with AnimatePresence dropdown, "
        "and ShimmerButton CTAs. The CanvasFractalGrid provides a fixed golden-dot background with "
        "wave-distortion mouse tracking, gradient animations, and noise overlay across all pages."
    , styles['Body']))
    
    story.append(Paragraph("2.3 Authentication System", styles['H2']))
    story.append(Paragraph(
        "Complete email/password authentication via Supabase Auth with SSR-safe cookie management. "
        "The auth callback route handles both OAuth code exchange and OTP verification (email confirmation, "
        "password reset, invite flows). Forms follow iOS design patterns with grouped input rows, "
        "system label colors, and hairline separators."
    , styles['Body']))
    story.append(ListFlowable([
        ListItem(Paragraph("<b>Login</b> — Email + password with grouped inputs, error handling, loading states, and 'Create Account' secondary CTA.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Signup</b> — Full name, email, password (8+ char minimum) with terms acknowledgment, loading states, and post-signup redirect to onboarding.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Forgot Password</b> — Email input with reset link dispatch, success state with mail icon, and 'Back to Sign In' navigation.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    
    story.append(Paragraph("2.4 Onboarding Path Selection", styles['H2']))
    story.append(Paragraph(
        "The onboarding page presents three distinct paths in a card-based layout, each with a "
        "category icon, label, sublabel badge, description, and chevron navigation. This is the first "
        "step of the entity onboarding journey after authentication."
    , styles['Body']))
    story.append(ListFlowable([
        ListItem(Paragraph("<b>Existing Business</b> (BRS registered) — Document upload and OCR verification path.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Register New Entity</b> (Not registered) — Guided questionnaire through BRS registration.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Informal Business</b> (Informal) — Readiness assessment with personalized formalization path.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    story.append(PageBreak())
    
    story.append(Paragraph("2.5 Content Management (Sanity CMS)", styles['H2']))
    story.append(Paragraph(
        "Sanity is configured as the headless CMS for the insights/blog engine. The schema defines "
        "an 'insight' document type with full editorial capabilities: title, slug (auto-generated from title), "
        "summary (max 200 chars), category (6 options: Compliance, Registration, Governance, Tax, Legal, Data & Privacy), "
        "cover image with hotspot, featured boolean, read time, publish date, and full Portable Text body with block and image support."
    , styles['Body']))
    story.append(Paragraph(
        "The CMS includes a custom Sanity Studio embedded at /studio using next-sanity, with structure tool "
        "plugin for content management. The public insights page uses ISR with 60-second revalidation, "
        "placeholder fallback data for offline development, and generateStaticParams for static generation at build time."
    , styles['Body']))
    
    story.append(Paragraph("2.6 Database Schema (Supabase)", styles['H2']))
    story.append(Paragraph(
        "The Supabase PostgreSQL schema has been fully typed with 1,076 lines of generated TypeScript types. "
        "The schema covers the full multi-tenant governance platform with 20+ tables including:"
    , styles['Body']))
    story.append(ListFlowable([
        ListItem(Paragraph("<b>audit_logs</b> — Immutable action logs with IP address, metadata, organisation linkage, and resource tracking.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>organisations</b> — Entity profiles with type, registration number, KRA PIN, tax status, and soft-delete support.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>profiles</b> — User profiles linked to Supabase Auth with role, phone, and avatar support.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>compliance_events</b> — Regulatory deadline tracking with recurrence, status workflow, and notification triggers.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>documents</b> — Document vault with versioning, namespace tagging, OCR metadata, and entity linkage.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>directors, shareholders, trustees</b> — Stakeholder management with KYC fields, shareholding, and appointment dates.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    
    story.append(Paragraph("2.7 Design System & Component Library", styles['H2']))
    story.append(Paragraph(
        "A comprehensive design system has been implemented with 30+ custom components and a full "
        "CSS custom property token layer. Key components include:"
    , styles['Body']))
    story.append(ListFlowable([
        ListItem(Paragraph("<b>ShimmerButton</b> — Conic-gradient shimmer animation with configurable background, shimmer color, and duration.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>ShinyButton</b> — Mask-driven sweep animation with spring physics and tap scaling.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>KineticText</b> — Per-character hover weight transition (300→900) with stroke width animation.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>TextReveal</b> — Scroll-driven word-by-word opacity reveal over 200vh scroll distance.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>TextAnimate</b> — Blur-in-up word animation with staggered timing and configurable delay.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>CanvasFractalGrid</b> — High-performance Canvas 2D dot grid with mouse wave distortion, gradient animation, and adaptive quality (low/medium/high FPS).", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Cloudscape</b> — Custom WebGL fragment shader with FBM noise, wind morphing, and three-color band mixing.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>Highlighter</b> — Rough-notation highlight wrapper with configurable action, color, stroke width, and view-trigger.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("<b>LexRegLogoMark</b> — Custom SVG logo with Africa continent outline and gold swoosh, parameterized by size and color.", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    story.append(PageBreak())
    
    # ─── FILE STRUCTURE ───
    story.append(Paragraph("3. PROJECT STRUCTURE", styles['H1']))
    story.append(Paragraph(
        "The codebase follows Next.js App Router conventions with clear separation of concerns:"
    , styles['Body']))
    structure_data = [
        [Paragraph('Path', styles['TableHeader']), Paragraph('Contents', styles['TableHeader'])],
        [Paragraph('app/', styles['TableCell']), Paragraph('Next.js App Router: layout.tsx, page.tsx, route handlers, route groups (auth, dashboard, onboarding), dynamic insights/[slug]', styles['TableCell'])],
        [Paragraph('components/landing/', styles['TableCell']), Paragraph('7 section components: hero-section, how-it-works-section, services-section, globe-section, insights-section, footer-section, insights-bento-grid', styles['TableCell'])],
        [Paragraph('components/ui/', styles['TableCell']), Paragraph('20+ reusable UI primitives: buttons, navbar, logo, text effects, grid, form elements, highlighter', styles['TableCell'])],
        [Paragraph('components/auth/', styles['TableCell']), Paragraph('LoginForm, SignupForm, ForgotPasswordForm with Supabase client integration', styles['TableCell'])],
        [Paragraph('components/forgeui/', styles['TableCell']), Paragraph('Cloudscape WebGL shader component for hero background', styles['TableCell'])],
        [Paragraph('lib/', styles['TableCell']), Paragraph('Utility libraries: supabase server/client, sanity client/queries, cn() helper', styles['TableCell'])],
        [Paragraph('sanity/', styles['TableCell']), Paragraph('Schema definitions (insight.ts), schemaTypes index, CLI and studio config', styles['TableCell'])],
        [Paragraph('types/', styles['TableCell']), Paragraph('Generated Supabase database.types.ts (1,076 lines)', styles['TableCell'])],
    ]
    structure_table = Table(structure_data, colWidths=[4.5*cm, 11*cm])
    structure_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ]))
    story.append(structure_table)
    story.append(PageBreak())
    
    # ─── WHAT'S PENDING ───
    story.append(Paragraph("4. PENDING IMPLEMENTATION & NEXT STEPS", styles['H1']))
    story.append(Paragraph(
        "The following items represent the next phase of development required to reach MVP readiness:"
    , styles['Body']))
    
    story.append(Paragraph("4.1 Dashboard (High Priority)", styles['H2']))
    story.append(ListFlowable([
        ListItem(Paragraph("Entity dashboard with quick stats, compliance score widget, and upcoming deadlines", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Document vault tab with upload, search, versioning, and namespace filtering", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Compliance calendar with recurring event creation, status workflow, and email reminders", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Stakeholder management (directors, shareholders, trustees) with KYC document linking", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    
    story.append(Paragraph("4.2 Onboarding Flows (High Priority)", styles['H2']))
    story.append(ListFlowable([
        ListItem(Paragraph("Existing Entity: Multi-step document upload with OCR preview, confidence threshold, and manual correction", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("New Entity: BRS questionnaire with conditional logic per entity type, save-as-draft, and progress persistence", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Informal Business: 10-15 question readiness assessment with maturity scoring and gap analysis dashboard", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    
    story.append(Paragraph("4.3 Paid Service Pillars (Medium Priority)", styles['H2']))
    story.append(ListFlowable([
        ListItem(Paragraph("Entity Formation & Registration: Document generation, BRS filing helper, certificate upload and verification", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Corporate Services: LexReg Diligence™ auto-generation of board resolutions, AGM notices, and corporate registers with lawyer review workflow", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Legal Audit: Comprehensive health check across statutory, contractual, and regulatory obligations with written report delivery", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    
    story.append(Paragraph("4.4 Integrations (Medium Priority)", styles['H2']))
    story.append(ListFlowable([
        ListItem(Paragraph("Paystack payment integration for M-Pesa, card, and bank payments per service pillar", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Google Document AI for OCR extraction of certificates, CR12, and ID documents", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("KRA verification mock (manual verification for MVP with API integration deferred)", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    
    story.append(Paragraph("4.5 Compliance & Legal (Pre-Launch)", styles['H2']))
    story.append(ListFlowable([
        ListItem(Paragraph("Privacy Policy and Terms of Service pages (drafted, pending Charles review)", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("ODPC registration and Data Protection Officer training", styles['BulletCustom']), bulletColor=GOLD, value='•'),
        ListItem(Paragraph("Row-level security policy hardening and penetration testing", styles['BulletCustom']), bulletColor=GOLD, value='•'),
    ], bulletType='bullet', leftIndent=18, bulletIndent=8))
    story.append(PageBreak())
    
    # ─── RISK ASSESSMENT ───
    story.append(Paragraph("5. RISK ASSESSMENT & MITIGATION", styles['H1']))
    risk_data = [
        [Paragraph('Risk', styles['TableHeader']), Paragraph('Severity', styles['TableHeader']), Paragraph('Mitigation', styles['TableHeader'])],
        [Paragraph('BRS has no public API — manual filing required', styles['TableCell']), Paragraph('HIGH', styles['StatusRed']), Paragraph('Hybrid workflow: system generates documents, user/lawyer manually files, uploads certificate back', styles['TableCell'])],
        [Paragraph('Solo developer capacity vs. enterprise scope', styles['TableCell']), Paragraph('HIGH', styles['StatusRed']), Paragraph('Ruthless MVP scoping: one entity type, one onboarding path, basic dashboard first', styles['TableCell'])],
        [Paragraph('OCR accuracy for Kenyan documents', styles['TableCell']), Paragraph('MEDIUM', styles['StatusAmber']), Paragraph('60% confidence threshold with human review; Google Document AI + fallback to manual', styles['TableCell'])],
        [Paragraph('Payment integration complexity', styles['TableCell']), Paragraph('MEDIUM', styles['StatusAmber']), Paragraph('Paystack business account setup; per-service payment triggers with clear UX', styles['TableCell'])],
        [Paragraph('Lawyer role ambiguity', styles['TableCell']), Paragraph('MEDIUM', styles['StatusAmber']), Paragraph('Clarify assignment logic: manual by Charles, auto by workload, or hybrid by tier', styles['TableCell'])],
        [Paragraph('Data Protection Act compliance', styles['TableCell']), Paragraph('MEDIUM', styles['StatusAmber']), Paragraph('RLS enabled, 30-day soft delete, audit logs, privacy policy, ODPC registration pre-launch', styles['TableCell'])],
    ]
    risk_table = Table(risk_data, colWidths=[5.5*cm, 3*cm, 7*cm])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ]))
    story.append(risk_table)
    story.append(PageBreak())
    
    # ─── CONCLUSION ───
    story.append(Paragraph("6. CONCLUSION & RECOMMENDATIONS", styles['H1']))
    story.append(Paragraph(
        "The LexReg Africa platform has achieved significant technical milestones in the current development "
        "phase. The public-facing experience is production-ready in terms of design, animation, and content "
        "management. The authentication layer is solid and secure. The design system is comprehensive and "
        "will accelerate all future UI development."
    , styles['Body']))
    story.append(Paragraph(
        "The critical path to MVP now runs through: (1) dashboard functional widgets, (2) onboarding flow "
        "implementation with save-as-draft and progress persistence, (3) payment integration for the three "
        "service pillars, and (4) lawyer-mediated workflow definition."
    , styles['Body']))
    story.append(Paragraph(
        "Recommendation: Prioritize the Existing Entity onboarding path with document upload and basic "
        "dashboard display. This delivers the smallest usable product that demonstrates platform value "
        "while Charles finalizes scope for Corporate Services and Legal Audit pillars."
    , styles['Body']))
    
    story.append(Spacer(1, 1.5*cm))
    story.append(Table([['']], colWidths=[6*cm], 
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), GOLD),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ])))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        "<i>This report was generated automatically from codebase analysis. "
        f"For questions, contact Ian Love Mangirwa at {datetime.now().strftime('%d %B %Y')}.</i>",
        styles['Footer']
    ))
    
    doc.build(story, onFirstPage=first_page, onLaterPages=header_footer)
    print(f"Development Audit PDF created: {os.path.join(output_dir, 'LexReg_Development_Audit.pdf')}")

if __name__ == '__main__':
    build_audit_pdf()
