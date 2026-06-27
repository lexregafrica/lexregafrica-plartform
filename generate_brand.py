import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime

# Brand colors
NAVY = HexColor('#1A1A2E')
GOLD = HexColor('#C9A227')
GOLD_LIGHT = HexColor('#E8C35A')
GOLD_PALE = HexColor('#F5DFA0')
LIGHT_GRAY = HexColor('#F5F5F5')
MED_GRAY = HexColor('#737373')
DARK_GRAY = HexColor('#333333')
WHITE = white
SYSTEM_BG = HexColor('#F2F2F7')
DESTRUCTIVE = HexColor('#FF3B30')

output_dir = "/Users/ianlove/workspaces/lexreg"

def make_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        'CoverTitle',
        parent=styles['Title'],
        fontSize=32,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=10,
        leading=38
    ))
    
    styles.add(ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontSize=16,
        textColor=MED_GRAY,
        alignment=TA_CENTER,
        spaceAfter=40,
        leading=20
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
        fontSize=18,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceAfter=12,
        spaceBefore=18,
        leading=22,
        borderColor=GOLD,
        borderWidth=2,
        borderPadding=4
    ))
    
    styles.add(ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceAfter=10,
        spaceBefore=14,
        leading=18
    ))
    
    styles.add(ParagraphStyle(
        'H3',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=NAVY,
        fontName='Helvetica-Bold',
        spaceAfter=8,
        spaceBefore=12,
        leading=16
    ))
    
    styles.add(ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_GRAY,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=10
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
        'Caption',
        parent=styles['Normal'],
        fontSize=9,
        textColor=MED_GRAY,
        leading=12,
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
    
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1.5)
    canvas.line(2.5*cm, height - 1.5*cm, width - 2.5*cm, height - 1.5*cm)
    
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MED_GRAY)
    canvas.drawString(2.5*cm, height - 1.2*cm, "LexReg Africa — Brand Guidelines")
    canvas.drawRightString(width - 2.5*cm, height - 1.2*cm, f"Page {doc.page}")
    
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MED_GRAY)
    canvas.drawCentredString(width/2, 1.2*cm, f"Version 1.0 | {datetime.now().strftime('%B %Y')} | For Internal Use")
    
    canvas.restoreState()

def first_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    
    # Gold bar at bottom
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, width, 8*mm, stroke=0, fill=1)
    
    # Navy accent bar at top
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 4*mm, width, 4*mm, stroke=0, fill=1)
    
    canvas.restoreState()

def color_swatch(hex_color, name, code):
    """Return a table row with color swatch and info"""
    return [
        Table([['']], colWidths=[1.5*cm], rowHeights=[1.2*cm],
            style=TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), HexColor(code)),
                ('BOX', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
            ])),
        Paragraph(f"<b>{name}</b><br/><font size='8' color='#737373'>{code}</font>", styles['TableCell'])
    ]

def build_brand_pdf():
    global styles
    styles = make_styles()
    doc = SimpleDocTemplate(
        os.path.join(output_dir, "LexReg_Brand_Guidelines.pdf"),
        pagesize=A4,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        leftMargin=2.5*cm, rightMargin=2.5*cm
    )
    story = []
    
    # ─── COVER PAGE ───
    story.append(Spacer(1, 5*cm))
    story.append(Paragraph("LEXREG AFRICA", styles['CoverTitle']))
    story.append(Paragraph("Brand Guidelines", styles['CoverSubtitle']))
    story.append(Spacer(1, 1*cm))
    
    story.append(Table([['']], colWidths=[8*cm], 
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), GOLD),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ])))
    story.append(Spacer(1, 1.5*cm))
    
    story.append(Paragraph("Visual Identity & Design System", styles['CoverMeta']))
    story.append(Paragraph(f"Version 1.0 | {datetime.now().strftime('%B %Y')}", styles['CoverMeta']))
    story.append(Paragraph("Prepared by: Ian Love Mangirwa, Lead Developer", styles['CoverMeta']))
    story.append(Paragraph("For: Mr. Charles, LexReg Africa Ltd", styles['CoverMeta']))
    story.append(Paragraph("Status: Final", styles['CoverMeta']))
    story.append(PageBreak())
    
    # ─── BRAND STORY ───
    story.append(Paragraph("1. BRAND STORY & POSITIONING", styles['H1']))
    story.append(Paragraph(
        "LexReg Africa is the Governance, Compliance & Organisational Readiness Operating System for "
        "Kenyan businesses. We move organisations from fragmented compliance management — emails, filing "
        "cabinets, shared drives, individual devices — to a single source of truth for governance, "
        "compliance, and institutional memory."
    , styles['Body']))
    story.append(Paragraph(
        "Our brand communicates <b>trust, authority, and precision</b> through a visual language that "
        "draws from the world's most respected institutions: government services, financial institutions, "
        "and premium technology platforms. We are not a startup. We are infrastructure."
    , styles['Body']))
    
    story.append(Paragraph("1.1 Brand Voice", styles['H2']))
    story.append(Paragraph(
        "<b>Clear over clever.</b> Every word must reduce ambiguity. If a user hesitates, we have failed. "
        "Our copy is direct, specific, and action-oriented. We avoid jargon unless it is the exact legal or "
        "regulatory term our user needs to hear."
    , styles['Body']))
    story.append(Paragraph(
        "<b>Assured, not arrogant.</b> We know Kenyan regulatory frameworks inside out, but we never "
        "talk down to our users. We guide. We clarify. We do not boast."
    , styles['Body']))
    story.append(Paragraph(
        "<b>Warmth in structure.</b> Compliance is cold. Our interface is not. We use human language, "
        "helpful animations, and clear visual hierarchy to make complex processes feel manageable."
    , styles['Body']))
    story.append(PageBreak())
    
    # ─── LOGO GUIDELINES ───
    story.append(Paragraph("2. LOGO & MARK", styles['H1']))
    story.append(Paragraph(
        "The LexReg Africa logo consists of a <b>Logomark</b> (the Africa continent with gold swoosh) and a "
        "<b>Wordmark</b> (LexReg Africa in SF Pro Display / Geist Sans). The mark may be used alone or with the wordmark."
    , styles['Body']))
    
    story.append(Paragraph("2.1 Logomark Construction", styles['H2']))
    story.append(Paragraph(
        "The logomark is an SVG path depicting the African continent outline in Brand Navy, with a sweeping "
        "gold arc (the 'swoosh') crossing from upper-left to lower-right. The swoosh represents forward "
        "momentum, growth, and the connection between governance and prosperity. The continent outline "
        "grounds us in our geography and mission."
    , styles['Body']))
    
    story.append(Paragraph("2.2 Clear Space & Minimum Size", styles['H2']))
    story.append(Paragraph(
        "Maintain clear space around the logo equal to the height of the 'LR' mark (approximately 28px at "
        "default size). The minimum digital size for the logomark is 20px. The minimum for the full "
        "wordmark combination is 80px wide. Never reproduce the logo smaller than these dimensions."
    , styles['Body']))
    
    story.append(Paragraph("2.3 Color Variations", styles['H2']))
    logo_var_data = [
        [Paragraph('Variant', styles['TableHeader']), Paragraph('Usage', styles['TableHeader']), Paragraph('Navy', styles['TableHeader']), Paragraph('Gold', styles['TableHeader'])],
        [Paragraph('Primary', styles['TableCell']), Paragraph('Light backgrounds, white surfaces, hero sections', styles['TableCell']), Paragraph('#1A1A2E', styles['TableCell']), Paragraph('#C9A227', styles['TableCell'])],
        [Paragraph('Reverse', styles['TableCell']), Paragraph('Dark backgrounds, navy cards, footer', styles['TableCell']), Paragraph('#FFFFFF', styles['TableCell']), Paragraph('#C9A227', styles['TableCell'])],
        [Paragraph('Monochrome', styles['TableCell']), Paragraph('Single-color printing, favicons, small icons', styles['TableCell']), Paragraph('#1A1A2E', styles['TableCell']), Paragraph('#1A1A2E', styles['TableCell'])],
    ]
    logo_var_table = Table(logo_var_data, colWidths=[4*cm, 6.5*cm, 2.5*cm, 2.5*cm])
    logo_var_table.setStyle(TableStyle([
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
    story.append(logo_var_table)
    
    story.append(Paragraph("2.4 Prohibited Uses", styles['H2']))
    story.append(Paragraph(
        "Do not: distort the logo proportions, rotate or tilt the mark, add drop shadows or glows, place the "
        "logo on busy backgrounds without a clear container, change the colors outside the approved "
        "variations, or use the swoosh alone without the continent outline."
    , styles['Body']))
    story.append(PageBreak())
    
    # ─── COLOR PALETTE ───
    story.append(Paragraph("3. COLOR PALETTE", styles['H1']))
    story.append(Paragraph(
        "The LexReg Africa color system is built on two foundational hues — Brand Navy and Brand Gold — "
        "extended by an iOS 18 system color layer for UI surfaces, states, and semantic meaning."
    , styles['Body']))
    
    story.append(Paragraph("3.1 Brand Colors", styles['H2']))
    brand_colors = [
        [Paragraph('Swatch', styles['TableHeader']), Paragraph('Name', styles['TableHeader']), Paragraph('Hex', styles['TableHeader']), Paragraph('RGB', styles['TableHeader']), Paragraph('Usage', styles['TableHeader'])],
        ['', Paragraph('Brand Navy', styles['TableCell']), Paragraph('#1A1A2E', styles['TableCell']), Paragraph('26, 26, 46', styles['TableCell']), Paragraph('Primary identity, headings, primary buttons, dark surfaces, navbar', styles['TableCell'])],
        ['', Paragraph('Brand Gold', styles['TableCell']), Paragraph('#C9A227', styles['TableCell']), Paragraph('201, 162, 39', styles['TableCell']), Paragraph('Accents, CTAs, highlights, progress indicators, decorative elements', styles['TableCell'])],
        ['', Paragraph('Gold Light', styles['TableCell']), Paragraph('#E8C35A', styles['TableCell']), Paragraph('232, 195, 90', styles['TableCell']), Paragraph('Secondary gold accents, hover states, globe arc variations', styles['TableCell'])],
        ['', Paragraph('Gold Pale', styles['TableCell']), Paragraph('#F5DFA0', styles['TableCell']), Paragraph('245, 223, 160', styles['TableCell']), Paragraph('Tertiary gold, background tints, subtle borders', styles['TableCell'])],
    ]
    # Add swatches
    for i, code in enumerate(['#1A1A2E', '#C9A227', '#E8C35A', '#F5DFA0'], 1):
        brand_colors[i][0] = Table([['']], colWidths=[1.5*cm], rowHeights=[1*cm],
            style=TableStyle([('BACKGROUND', (0,0), (-1,-1), HexColor(code)), ('BOX', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb'))]))
    
    bc_table = Table(brand_colors, colWidths=[2.5*cm, 3*cm, 2.5*cm, 2.5*cm, 5*cm])
    bc_table.setStyle(TableStyle([
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
    story.append(bc_table)
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("3.2 iOS 18 System Colors", styles['H2']))
    story.append(Paragraph(
        "For UI surfaces, we adopt Apple's iOS 18 system color semantics. This ensures the platform feels "
        "native on iOS and polished on all devices."
    , styles['Body']))
    system_colors = [
        [Paragraph('Token', styles['TableHeader']), Paragraph('Hex / Value', styles['TableHeader']), Paragraph('Usage', styles['TableHeader'])],
        [Paragraph('System Background', styles['TableCell']), Paragraph('#FFFFFF', styles['TableCell']), Paragraph('Primary app background, cards, popovers', styles['TableCell'])],
        [Paragraph('System Background 2', styles['TableCell']), Paragraph('#F2F2F7', styles['TableCell']), Paragraph('Grouped sections, auth layouts, onboarding background', styles['TableCell'])],
        [Paragraph('System Label', styles['TableCell']), Paragraph('rgba(0,0,0,1)', styles['TableCell']), Paragraph('Primary text, headings, body copy', styles['TableCell'])],
        [Paragraph('System Label 2', styles['TableCell']), Paragraph('rgba(60,60,67,0.60)', styles['TableCell']), Paragraph('Secondary text, subtitles, descriptions', styles['TableCell'])],
        [Paragraph('System Label 3', styles['TableCell']), Paragraph('rgba(60,60,67,0.30)', styles['TableCell']), Paragraph('Tertiary text, placeholders, disabled states', styles['TableCell'])],
        [Paragraph('System Separator', styles['TableCell']), Paragraph('rgba(60,60,67,0.29)', styles['TableCell']), Paragraph('Hairline dividers, input borders, list separators', styles['TableCell'])],
        [Paragraph('System Fill', styles['TableCell']), Paragraph('rgba(120,120,128,0.20)', styles['TableCell']), Paragraph('Secondary button backgrounds, hover states', styles['TableCell'])],
        [Paragraph('Destructive', styles['TableCell']), Paragraph('#FF3B30', styles['TableCell']), Paragraph('Error messages, delete actions, validation failures', styles['TableCell'])],
    ]
    sc_table = Table(system_colors, colWidths=[4.5*cm, 3.5*cm, 7.5*cm])
    sc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ]))
    story.append(sc_table)
    story.append(PageBreak())
    
    # ─── TYPOGRAPHY ───
    story.append(Paragraph("4. TYPOGRAPHY", styles['H1']))
    story.append(Paragraph(
        "LexReg Africa uses a dual-font strategy: <b>Geist Sans</b> (primary) and <b>Geist Mono</b> (monospace) "
        "loaded via Next.js font optimization, with <b>SF Pro Display</b> and <b>SF Pro Text</b> as stylistic "
        "fallbacks for Apple-native aesthetic."
    , styles['Body']))
    
    story.append(Paragraph("4.1 Font Stack", styles['H2']))
    story.append(Paragraph(
        "<b>Display & Headings:</b> SF Pro Display, Geist Sans, system-ui, -apple-system, sans-serif<br/>"
        "<b>Body & UI:</b> SF Pro Text, Geist Sans, system-ui, sans-serif<br/>"
        "<b>Monospace (data, code, timestamps):</b> Geist Mono, ui-monospace, monospace"
    , styles['Body']))
    
    story.append(Paragraph("4.2 iOS 18 Typography Scale", styles['H2']))
    story.append(Paragraph(
        "All typography follows Apple's Human Interface Guidelines for iOS 18, with exact letter-spacing "
        "values derived from SF Pro metrics. This scale is implemented as CSS utility classes."
    , styles['Body']))
    
    type_scale = [
        [Paragraph('Style', styles['TableHeader']), Paragraph('Size', styles['TableHeader']), Paragraph('Line Height', styles['TableHeader']), Paragraph('Weight', styles['TableHeader']), Paragraph('Letter Spacing', styles['TableHeader']), Paragraph('Usage', styles['TableHeader'])],
        [Paragraph('Display', styles['TableCell']), Paragraph('34px', styles['TableCell']), Paragraph('41px', styles['TableCell']), Paragraph('700', styles['TableCell']), Paragraph('-0.4px', styles['TableCell']), Paragraph('Onboarding headlines, hero subheads', styles['TableCell'])],
        [Paragraph('Title 1', styles['TableCell']), Paragraph('28px', styles['TableCell']), Paragraph('34px', styles['TableCell']), Paragraph('700', styles['TableCell']), Paragraph('-0.15px', styles['TableCell']), Paragraph('Auth page titles, modal headers', styles['TableCell'])],
        [Paragraph('Title 2', styles['TableCell']), Paragraph('22px', styles['TableCell']), Paragraph('28px', styles['TableCell']), Paragraph('700', styles['TableCell']), Paragraph('-0.35px', styles['TableCell']), Paragraph('Section headings, card titles', styles['TableCell'])],
        [Paragraph('Title 3', styles['TableCell']), Paragraph('20px', styles['TableCell']), Paragraph('25px', styles['TableCell']), Paragraph('600', styles['TableCell']), Paragraph('-0.45px', styles['TableCell']), Paragraph('Subsection headings, insight titles', styles['TableCell'])],
        [Paragraph('Headline', styles['TableCell']), Paragraph('17px', styles['TableCell']), Paragraph('22px', styles['TableCell']), Paragraph('600', styles['TableCell']), Paragraph('-0.41px', styles['TableCell']), Paragraph('Button labels, form labels, nav items', styles['TableCell'])],
        [Paragraph('Body', styles['TableCell']), Paragraph('17px', styles['TableCell']), Paragraph('22px', styles['TableCell']), Paragraph('400', styles['TableCell']), Paragraph('-0.41px', styles['TableCell']), Paragraph('Primary body text, descriptions', styles['TableCell'])],
        [Paragraph('Callout', styles['TableCell']), Paragraph('16px', styles['TableCell']), Paragraph('21px', styles['TableCell']), Paragraph('400', styles['TableCell']), Paragraph('-0.32px', styles['TableCell']), Paragraph('Secondary body, onboarding descriptions', styles['TableCell'])],
        [Paragraph('Subhead', styles['TableCell']), Paragraph('15px', styles['TableCell']), Paragraph('20px', styles['TableCell']), Paragraph('400', styles['TableCell']), Paragraph('-0.23px', styles['TableCell']), Paragraph('Labels, metadata, captions', styles['TableCell'])],
        [Paragraph('Footnote', styles['TableCell']), Paragraph('13px', styles['TableCell']), Paragraph('18px', styles['TableCell']), Paragraph('400', styles['TableCell']), Paragraph('-0.08px', styles['TableCell']), Paragraph('Helper text, disclaimers, legal copy', styles['TableCell'])],
        [Paragraph('Caption 1', styles['TableCell']), Paragraph('12px', styles['TableCell']), Paragraph('16px', styles['TableCell']), Paragraph('400', styles['TableCell']), Paragraph('0px', styles['TableCell']), Paragraph('Badges, timestamps, small labels', styles['TableCell'])],
        [Paragraph('Caption 2', styles['TableCell']), Paragraph('11px', styles['TableCell']), Paragraph('13px', styles['TableCell']), Paragraph('400', styles['TableCell']), Paragraph('0.066px', styles['TableCell']), Paragraph('Micro-labels, data table headers', styles['TableCell'])],
    ]
    ts_table = Table(type_scale, colWidths=[3*cm, 2*cm, 2.5*cm, 2*cm, 3*cm, 5*cm])
    ts_table.setStyle(TableStyle([
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
    story.append(ts_table)
    story.append(PageBreak())
    
    # ─── SPACING & RADIUS ───
    story.append(Paragraph("5. SPACING, RADIUS & LAYOUT", styles['H1']))
    story.append(Paragraph(
        "The layout system follows iOS 18 grouped-section conventions with a consistent spacing and "
        "border-radius scale. All values are expressed in CSS custom properties for maintainability."
    , styles['Body']))
    
    story.append(Paragraph("5.1 Border Radius Scale", styles['H2']))
    radius_data = [
        [Paragraph('Token', styles['TableHeader']), Paragraph('Value', styles['TableHeader']), Paragraph('Usage', styles['TableHeader'])],
        [Paragraph('sm', styles['TableCell']), Paragraph('6px', styles['TableCell']), Paragraph('Small chips, badges, inline tags', styles['TableCell'])],
        [Paragraph('md / base', styles['TableCell']), Paragraph('10px', styles['TableCell']), Paragraph('Inputs, small buttons, dropdowns', styles['TableCell'])],
        [Paragraph('lg', styles['TableCell']), Paragraph('16px', styles['TableCell']), Paragraph('Grouped sections, cards, modals', styles['TableCell'])],
        [Paragraph('xl', styles['TableCell']), Paragraph('20px', styles['TableCell']), Paragraph('Large cards, hero containers, onboarding panels', styles['TableCell'])],
        [Paragraph('2xl', styles['TableCell']), Paragraph('24px', styles['TableCell']), Paragraph('Feature cards, bento grid items', styles['TableCell'])],
        [Paragraph('full', styles['TableCell']), Paragraph('9999px', styles['TableCell']), Paragraph('Pills, buttons, avatars, status indicators', styles['TableCell'])],
    ]
    radius_table = Table(radius_data, colWidths=[4*cm, 3*cm, 7.5*cm])
    radius_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ]))
    story.append(radius_table)
    
    story.append(Paragraph("5.2 Grouped Section Pattern (iOS Settings Style)", styles['H2']))
    story.append(Paragraph(
        "For forms, settings, and data entry, use the iOS Grouped Section pattern: a white container with "
        "16px border-radius, 0.5px hairline separators between rows, and 44px minimum row height. Each row "
        "has 16px horizontal padding and 12px gap between label and input."
    , styles['Body']))
    story.append(Paragraph(
        "<b>Example:</b> The login form uses an <i>ios-group</i> container with two <i>ios-group-row</i> elements "
        "(Email and Password), separated by a 0.5px solid var(--system-sep) border. The label is 88px wide "
        "with text-ios-subhead styling. The input is flex-1 with transparent background, text-ios-body, and "
        "caret-color: var(--brand-navy)."
    , styles['Body']))
    story.append(PageBreak())
    
    # ─── UI COMPONENTS ───
    story.append(Paragraph("6. UI COMPONENT LIBRARY", styles['H1']))
    story.append(Paragraph(
        "The LexReg component library is built on shadcn/ui primitives with extensive custom styling and "
        "animation. Below are the signature components that define the product experience."
    , styles['Body']))
    
    story.append(Paragraph("6.1 Buttons", styles['H2']))
    comp_data = [
        [Paragraph('Component', styles['TableHeader']), Paragraph('Description', styles['TableHeader']), Paragraph('Styling', styles['TableHeader'])],
        [Paragraph('ShimmerButton', styles['TableCell']), Paragraph('Primary CTA with rotating conic-gradient shimmer. Used for all primary actions.', styles['TableCell']), Paragraph('Navy background (#1A1A2E), gold shimmer (#C9A227), 2.5s duration, rounded-full', styles['TableCell'])],
        [Paragraph('ShinyButton', styles['TableCell']), Paragraph('Secondary accent with sweeping gold mask animation. Used for badges and subtle CTAs.', styles['TableCell']), Paragraph('White/transparent background, gold mask sweep, rounded-lg, blur backdrop', styles['TableCell'])],
        [Paragraph('Primary Button', styles['TableCell']), Paragraph('Standard primary action in grouped forms.', styles['TableCell']), Paragraph('Navy background, white text, rounded-2xl, 50px min-height, active:opacity-70', styles['TableCell'])],
        [Paragraph('Secondary Button', styles['TableCell']), Paragraph('Alternative action in grouped forms.', styles['TableCell']), Paragraph('System fill-3 background, navy text, rounded-2xl, 50px min-height', styles['TableCell'])],
    ]
    comp_table = Table(comp_data, colWidths=[4*cm, 6*cm, 6.5*cm])
    comp_table.setStyle(TableStyle([
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
    story.append(comp_table)
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("6.2 Text Effects", styles['H2']))
    story.append(Paragraph(
        "<b>KineticText:</b> Per-character font-weight animation on hover (300 → 900) with stroke-width transition. "
        "Used for the hero headline 'Start strong. Stay compliant.'<br/><br/>"
        "<b>TextReveal:</b> Scroll-driven word-by-word opacity reveal over 200vh. The word color transitions from "
        "navy at 20% opacity to full navy as the user scrolls. Used for 'From idea to fully compliant entity.'<br/><br/>"
        "<b>TextAnimate (blurInUp):</b> Per-word blur-and-translate entrance animation with configurable delay, "
        "duration, and stagger. Used for section headings in Services, Globe, and Insights.<br/><br/>"
        "<b>TypingAnimation:</b> Character-by-character typewriter effect with blinking cursor. Used for the "
        "Services section headline 'Everything your business needs to stay compliant.'"
    , styles['Body']))
    
    story.append(Paragraph("6.3 Navigation", styles['H2']))
    story.append(Paragraph(
        "<b>NotchNavbar:</b> Fixed top navigation with a distinctive 'notch' silhouette created via SVG clip-path. "
        "Features frosted glass surfaces (backdrop-filter: blur(14px)), smooth-scroll anchor links, mobile "
        "hamburger menu with AnimatePresence dropdown, and ShimmerButton CTAs. The notch curves are drawn "
        "with SVG path strokes at 0.75px using rgba(0,0,0,0.06)."
    , styles['Body']))
    
    story.append(Paragraph("6.4 Backgrounds & Effects", styles['H2']))
    story.append(Paragraph(
        "<b>CanvasFractalGrid:</b> High-performance Canvas 2D background with animated dot grid, mouse-wave "
        "distortion, gradient animation, and noise overlay. Configurable: dotSize, dotSpacing, dotOpacity, "
        "waveIntensity, waveRadius, dotColor, glowColor, and performance tier (low/medium/high based on FPS).<br/><br/>"
        "<b>Cloudscape:</b> Custom WebGL fragment shader using FBM (fractal Brownian motion) noise with 6 octaves, "
        "wind morphing, and three-color band mixing. Used as the hero section full-bleed background."
    , styles['Body']))
    story.append(PageBreak())
    
    # ─── MOTION & ANIMATION ───
    story.append(Paragraph("7. MOTION & ANIMATION PRINCIPLES", styles['H1']))
    story.append(Paragraph(
        "Motion in the LexReg interface serves three purposes: guide attention, confirm interaction, and "
        "create spatial memory. Every animation has a functional justification. Decorative motion is used "
        "sparingly and only on the landing page."
    , styles['Body']))
    
    story.append(Paragraph("7.1 Easing Curves", styles['H2']))
    story.append(Paragraph(
        "The primary easing curve is <b>[0.16, 1, 0.3, 1]</b> — a custom cubic-bezier that produces a sharp acceleration "
        "followed by a gentle deceleration. This creates a 'premium snap' feel without being bouncy. It is used "
        "for all entrance animations, hover transitions, and layout changes."
    , styles['Body']))
    story.append(Paragraph(
        "For spring physics (card hover, stat card shuffle): <b>stiffness: 200, damping: 16</b> or <b>stiffness: 500, damping: 35</b> "
        "depending on the mass of the element being animated."
    , styles['Body']))
    
    story.append(Paragraph("7.2 Timing Tokens", styles['H2']))
    timing_data = [
        [Paragraph('Duration', styles['TableHeader']), Paragraph('Usage', styles['TableHeader'])],
        [Paragraph('0.18s', styles['TableCell']), Paragraph('Micro-interactions: menu toggle, icon swap, color fade', styles['TableCell'])],
        [Paragraph('0.3s', styles['TableCell']), Paragraph('Standard hover: button opacity, card scale, link color', styles['TableCell'])],
        [Paragraph('0.5s', styles['TableCell']), Paragraph('Entrance: eyebrow badge, small elements, stat cards', styles['TableCell'])],
        [Paragraph('0.6–0.8s', styles['TableCell']), Paragraph('Primary entrance: headlines, sections, bento cards', styles['TableCell'])],
        [Paragraph('0.9s', styles['TableCell']), Paragraph('Hero headline entrance: KineticText, display copy', styles['TableCell'])],
        [Paragraph('1.2s', styles['TableCell']), Paragraph('Ambient: globe auto-rotate, progress bar fill', styles['TableCell'])],
        [Paragraph('2.5–3.5s', styles['TableCell']), Paragraph('Continuous: shimmer sweep, bar chart oscillation, task carousel', styles['TableCell'])],
    ]
    timing_table = Table(timing_data, colWidths=[4*cm, 11.5*cm])
    timing_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
    ]))
    story.append(timing_table)
    
    story.append(Paragraph("7.3 Accessibility", styles['H2']))
    story.append(Paragraph(
        "All animations respect <b>prefers-reduced-motion</b>. The useReducedMotion hook from Motion (Framer Motion) "
        "is used to disable entrance animations, auto-rotate, and continuous loops for users who have opted "
        "for reduced motion in their system settings."
    , styles['Body']))
    story.append(PageBreak())
    
    # ─── ICONOGRAPHY ───
    story.append(Paragraph("8. ICONOGRAPHY", styles['H1']))
    story.append(Paragraph(
        "LexReg Africa uses <b>Tabler Icons</b> as the primary icon library. Tabler provides a consistent, "
        "lightweight, and comprehensive set of outline icons that align with the iOS design aesthetic. All "
        "icons are rendered as SVG with stroke-width of 1.5px for standard usage and 2px for emphasis."
    , styles['Body']))
    story.append(Paragraph(
        "<b>Color rules:</b> Icons in navigation and secondary contexts use #737373 (system-label-2). Icons in "
        "primary actions or active states use #1A1A2E (brand-navy). Icons in gold-accent contexts use #C9A227. "
        "Icons in success states use #059669. Icons in destructive contexts use #FF3B30."
    , styles['Body']))
    story.append(Paragraph(
        "<b>Size rules:</b> Navigation icons: 16–20px. Form/section icons: 20–24px. Feature cards: 28px. "
        "Social icons: 15px. Status badges: 10–13px."
    , styles['Body']))
    story.append(PageBreak())
    
    # ─── APPLICATION EXAMPLES ───
    story.append(Paragraph("9. APPLICATION EXAMPLES", styles['H1']))
    story.append(Paragraph(
        "The following examples demonstrate correct brand application across key product surfaces."
    , styles['Body']))
    
    story.append(Paragraph("9.1 Landing Page Hero", styles['H2']))
    story.append(Paragraph(
        "<b>Background:</b> Cloudscape WebGL shader (sky blue → white gradient) with full bleed.<br/>"
        "<b>Headline:</b> KineticText, SF Pro Display, clamp(42px, 7vw, 68px), weight 300 (hover: 900), color #1A1A2E, letter-spacing -0.03em.<br/>"
        "<b>Subhead:</b> SF Pro Text, 17px, weight 400, color #333333, max-width 440px, 17 words maximum.<br/>"
        "<b>Primary CTA:</b> ShimmerButton, navy background (#1A1A2E), gold shimmer (#C9A227), 2.5s duration, text 'Get started', 15px font.<br/>"
        "<b>Secondary CTA:</b> Frosted glass pill, rgba(255,255,255,0.68), backdrop-filter blur(12px), border 1px solid rgba(26,26,46,0.18), text 'How it works'."
    , styles['Body']))
    
    story.append(Paragraph("9.2 Authentication Form", styles['H2']))
    story.append(Paragraph(
        "<b>Layout:</b> Centered on ios-bg (#F2F2F7) with 100dvh min-height.<br/>"
        "<b>Logo:</b> LR mark in navy rounded square (40px) + 'LexReg' wordmark + 'Africa' subtitle.<br/>"
        "<b>Title:</b> text-ios-title1, color var(--system-label).<br/>"
        "<b>Inputs:</b> ios-group container with ios-group-row items, 88px label width, transparent input background, navy caret.<br/>"
        "<b>Primary button:</b> Navy background, white text, rounded-2xl, 50px min-height.<br/>"
        "<b>Secondary button:</b> System fill-3 background, navy text, rounded-2xl."
    , styles['Body']))
    
    story.append(Paragraph("9.3 Insights Card (Featured)", styles['H2']))
    story.append(Paragraph(
        "<b>Background:</b> rgba(26, 26, 46, 0.90) with 1px border rgba(201, 162, 39, 0.18).<br/>"
        "<b>Corner radius:</b> 20px.<br/>"
        "<b>Category badge:</b> Rounded-full, background {color}18, text color matching category.<br/>"
        "<b>Headline:</b> SF Pro Display, clamp(20px, 2.4vw, 28px), weight 700, white.<br/>"
        "<b>Summary:</b> SF Pro Text, 14px, rgba(255,255,255,0.60).<br/>"
        "<b>CTA:</b> Gold text (#C9A227), 14px, with arrow icon in gold circle background."
    , styles['Body']))
    story.append(PageBreak())
    
    # ─── DO'S AND DON'TS ───
    story.append(Paragraph("10. DO'S AND DON'TS", styles['H1']))
    
    do_dont_data = [
        [Paragraph('DO', styles['TableHeader']), Paragraph('DON\'T', styles['TableHeader'])],
        [Paragraph('Use navy as the primary text and heading color on light backgrounds.', styles['TableCell']), Paragraph('Use pure black (#000000) for text. It is too harsh against the iOS system colors.', styles['TableCell'])],
        [Paragraph('Use gold sparingly — for CTAs, accents, progress indicators, and decorative highlights only.', styles['TableCell']), Paragraph('Use gold for large background areas or primary text. It becomes visually overwhelming.', styles['TableCell'])],
        [Paragraph('Maintain the iOS grouped-section pattern for all forms, settings, and data entry.', styles['TableCell']), Paragraph('Use card-based form layouts with drop shadows. The iOS style uses hairlines and clear space.', styles['TableCell'])],
        [Paragraph('Use the full typography scale with exact letter-spacing values.', styles['TableCell']), Paragraph('Use generic font-size values without matching line-height and letter-spacing.', styles['TableCell'])],
        [Paragraph('Use 16px border-radius for grouped sections and 10px for inputs.', styles['TableCell']), Paragraph('Use arbitrary border-radius values that do not match the iOS scale.', styles['TableCell'])],
        [Paragraph('Use 0.5px hairline borders for separators between grouped rows.', styles['TableCell']), Paragraph('Use 1px solid borders for internal separators. They are too heavy.', styles['TableCell'])],
        [Paragraph('Use Tabler Icons at 1.5px stroke-width for consistency.', styles['TableCell']), Paragraph('Mix icon libraries or use filled icons alongside outline icons.', styles['TableCell'])],
        [Paragraph('Respect prefers-reduced-motion for all animations.', styles['TableCell']), Paragraph('Force animations on users who have opted for reduced motion.', styles['TableCell'])],
        [Paragraph('Use the LR mark at minimum 20px and the full wordmark at minimum 80px wide.', styles['TableCell']), Paragraph('Reproduce the logo smaller than the minimum sizes or distort its proportions.', styles['TableCell'])],
    ]
    do_dont_table = Table(do_dont_data, colWidths=[7.75*cm, 7.75*cm])
    do_dont_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), HexColor('#059669')),
        ('BACKGROUND', (1,0), (1,0), HexColor('#dc2626')),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#f0fdf4'), HexColor('#fef2f2')]),
    ]))
    story.append(do_dont_table)
    story.append(PageBreak())
    
    # ─── CONCLUSION ───
    story.append(Paragraph("11. CONCLUSION", styles['H1']))
    story.append(Paragraph(
        "The LexReg Africa brand is built on the principle of <b>institutional trust expressed through modern "
        "craft</b>. The Navy & Gold palette evokes authority and prestige. The iOS 18 design system ensures "
        "familiarity and usability. The custom animation layer adds personality without sacrificing performance "
        "or accessibility."
    , styles['Body']))
    story.append(Paragraph(
        "This guideline is a living document. As the product evolves, new components, patterns, and use cases "
        "will be documented here. All designers and developers working on LexReg Africa should treat this "
        "document as the single source of truth for visual and interaction decisions."
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
        "<i>For questions or additions to this guideline, contact Ian Love Mangirwa, Lead Developer.</i>",
        styles['Footer']
    ))
    
    doc.build(story, onFirstPage=first_page, onLaterPages=header_footer)
    print(f"Brand Guidelines PDF created: {os.path.join(output_dir, 'LexReg_Brand_Guidelines.pdf')}")

if __name__ == '__main__':
    build_brand_pdf()
