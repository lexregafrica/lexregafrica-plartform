# LexReg UI Revamp — mockup build spec

You are building high-fidelity, partly interactive mockups of LexReg Africa screens as
artboards on a Design canvas. LexReg is a governance/compliance SaaS for Kenyan businesses
(Next.js app at /Users/ianlove/workspaces/Lexreg — read its source for real copy, fields,
steps and states; do NOT edit any app source — only write your own board files).

Direction (locked by the user):
- Design tokens from the Zeno admin console (/Users/ianlove/workspaces/zoho-books-clone copy 2/src/app/(admin),
  src/components/AdminSidebar.tsx, src/components/ui.tsx, src/app/globals.css): Apple-calm neutrals,
  hairline 0.5px separators, 12px cards with soft shadow, translucent sidebar chrome, dense
  13–15px desktop type, uppercase group labels, large tabular numerals, pills.
- Keep LexReg colours: burgundy #800020 brand on white. (Zeno's teal/red accents are NOT used.)
- Apple HIG + Apple fluid-interface rules for hierarchy, materials, motion, touch targets.

All of that is already encoded in ONE shared stylesheet. Use its classes and CSS variables;
do not invent a parallel styling system. Read it before you start:
  /Users/ianlove/workspaces/Lexreg/resources/mockups/ui-revamp/assets/base.css
(The published copy also contains ~120 icon classes listed below.)

Write your files ONLY to:
  /Users/ianlove/workspaces/Lexreg/resources/mockups/ui-revamp/canvas/project/<Name>.dc.html
Do not publish anything; the orchestrator publishes.

---------------------------------------------------------------------------
## 1. The .dc.html format (each rule fails SILENTLY if broken)

Every artboard is ONE self-contained file in exactly this shape:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Dashboard — LexReg</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="/_blob/f3cded53e7fed4f078920ca82a469759">
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div class="lx {{theme}}" style="min-height: 900px">
  ... all UI markup ...
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"dark":{"editor":"boolean","default":false},"$preview":{"width":1440,"height":1400}}'>
class Component extends DCLogic {
renderVals() {
const s = this.state || {};
return {
  theme: this.props.dark ? 'lx-dark' : ''
};
}
}
</script>
</body>
</html>
```

Hard rules:
- Keep `<script src="./support.js"></script>` and the stylesheet `<link>` line EXACTLY as above, in that order.
- Close every non-void element; quote every attribute. Void: br, img, input, meta, link, hr.
- ALL UI is markup inside `<x-dc>`. Never build UI from script (no innerHTML, appendChild, document.*, window.X).
- `{{hole}}` = dotted lookup into renderVals() only (`{{user.name}}`, `{{item.label}}`, `{{$index}}`).
  NEVER an expression (`{{a+b}}`, `{{!x}}`, `{{fn()}}`, `{{x ? a : b}}` all fail). Compute in renderVals().
- Attributes: `x="literal"`; `x="{{path}}"` passes the raw value (function, number); `x="a {{p}} b"` interpolates a string.
  `class` → className and `for` → htmlFor automatically.
- Events: JSX camelCase whole-value holes: `onClick="{{goNext}}"`, `onInput="{{setQuery}}"`, `onChange="{{pick}}"`.
  Handlers are functions returned from renderVals(). Per-item handlers: build them in renderVals:
  `items: rows.map((r) => ({ ...r, cls: s.sel === r.id ? 'is-selected' : '', pick: () => this.setState({ sel: r.id }) }))`
  then `<sc-for list="{{items}}" as="item" hint-placeholder-count="3"> <button class="choice {{item.cls}}" onClick="{{item.pick}}">…`
- Branches: `<sc-if value="{{showSheet}}" hint-placeholder-val="{{false}}">…</sc-if>` (no else — use two sc-ifs with two booleans).
  Loops: `<sc-for list="{{rows}}" as="row" hint-placeholder-count="4">…{{row.name}}…</sc-for>`. ALWAYS set the hint-* attrs.
- State: read `const s = this.state || {};` and default every field with `??` in renderVals(); change with `this.setState({...})`.
- Logic class: plain classic JS, `class Component extends DCLogic`, no imports/exports/TypeScript. Only `renderVals()`
  (plus optional lifecycle). A `setTimeout` that only calls setState is fine.
- `data-props` is a single-quoted HTML attribute holding JSON: escape `&` as `&amp;`, a literal `'` as `&#39;`,
  `"` inside JSON strings as `\"`. Keep tweak props FEW: always `dark` (boolean); add an `enum` only for
  a real state lever (e.g. `"state":{"editor":"enum","options":["empty","reading","review"],"default":"review"}`).
  Never make tweaks for copy. Fall back with `this.props.x ?? default` in renderVals.
- `$preview` = width 1440 for every PAGE, height = rendered height at 1440 (over-tall beats clipped). Report it.
- Inline `style="…"` is fine. Use CSS variables in inline styles, never raw hex except the palette demo on Foundations.
- `<helmet><style>` holds only `body{margin:0}` and, if needed, a few page-specific rules.
- No `<iframe>`, `<object>`, `<embed>`, no emoji, no external network.
- Logo: `<img class="brand-logo" src="/_blob/a2c8945f1f7196abaa7009dd14de1c46" alt="LexReg Africa" style="width: 30px; height: 30px">`
  (dark chrome Africa outline; .lx-dark inverts `.sb-brand img` and `.brand-logo`). Other imagery: build with CSS / real UI fragments.
- Links between artboards: `<a href="Workspace.dc.html" class="btn btn-primary">Open</a>`. Style the `<a>` itself as the button —
  never a `<button>` inside an `<a>`, never `<a>` inside `<a>`. Only link to boards in section 6.
- Accessibility: real `<button>`, `<a href>`, `<input>` with `<label for>`; `aria-label` on icon-only buttons; no onClick on div/span.
  Decorative icons: `<span class="ic ic-bell" aria-hidden="true"></span>`. Text ≥4.5:1 — `--label-2`/`--label-3` for secondary, never `--label-4` for copy.
- Root is FLUID: no px width on root/shell; max-width containers, %, fr, gap. px heights fine. No `vh`, no `position: fixed`.
- Layout responds to the `.lx` CONTAINER (container queries), not the viewport. Never `@media (max-width)`; if needed use
  `@container lx (max-width: 720px) { … }` in helmet. Page must work at 390px wide: menus stack, toolbars wrap, tables in `.table-wrap`.

---------------------------------------------------------------------------
## 2. Design system cheat-sheet (all in the stylesheet)

Root: `.lx` (+ `.lx-dark` via `{{theme}}`). Background `--bg` (#F5F5F7); content on white `.card`s.

Colour vars: `--brand` #800020 · `--tint`/`--tint-text` · `--brand-50/100/200/300/600/700` · `--bg --surface --surface-2 --surface-3` ·
`--label --label-2 --label-3 --label-4` · `--sep --sep-soft` · `--fill --fill-2 --fill-3 --fill-4` · status `--good --warn --bad --info`
with `--*-bg` and `--*-line` · graphics-only `--sys-green --sys-orange --sys-red --sys-blue --sys-indigo --sys-teal --sys-yellow`.
Radii `--r-xs 6 --r-sm 8 --r-md 10 --r-card 12 --r-lg 16 --r-xl 22 --r-full`. Shadows `--shadow-card --shadow-raise --shadow-pop --shadow-sheet`.

Type: `.t-display .t-hero .t-large .t-title1 .t-title2 .t-title3 .t-headline .t-body .t-callout .t-subhead .t-footnote .t-caption .t-eyebrow .t-stat .t-num .t-mono .t-serif`;
colour `.t-2 .t-3 .t-brand .t-good .t-warn .t-bad .t-info .t-strong`; `.truncate .clamp-2 .t-balance .t-pretty`. One page title per page.

Layout: `.stack .row .wrap .between .grow .gap-1…gap-12 .grid .cols-2/3/4/5/12 .span-* .container .narrow .divider`
(cols collapse on phone; `.keep-2` keeps 2; `.cols-4/.cols-5` drop at ≤1080 unless `.keep`). `.hide-compact .only-compact .hide-medium`.

Surfaces: `.card .card-pad .card-lg .card-head .card-foot .card-interactive .well .inset`. Materials (navigation layer ONLY): `.glass .glass-chrome`.
Buttons: `.btn` + `.btn-primary` (one per view) `.btn-tinted .btn-secondary .btn-gray .btn-plain .btn-destructive .btn-destructive-plain`, `.btn-sm .btn-lg .btn-pill .btn-icon .btn-block`.
Pills `.pill .pill-good/warn/bad/info/brand/solid/outline`, `.dot .badge .kbd`. Avatars `.avatar .avatar-sm .avatar-lg .avatar-corp .avatar-ink`. `.icon-tile .icon-tile-lg` (+ `.good .warn .bad .info .gray`).
Forms: `.field > .label(.req) + .input/.select/.textarea + .help/.error`; `.field.is-invalid`; `.input-wrap` (leading `.ic`, `.trail`); `.form-grid .form-section`.
Choice cards `button.choice(.is-selected) > span.mark(.square)`. `.toggle(.is-on)`. Segmented `<div class="seg" style="--n:3; --i:{{segIndex}}">` buttons `.is-on`.
Tabs `.tabs` with a/button children, `.is-on`. Lists `.list > .list-row(.has-icon .is-link) .list-title .list-sub .chev .list-head`.
Tables `.table-wrap > table.table`, `.num`. Stats `.stat > .stat-label + .t-stat + .stat-sub`. `.progress > span[style=width]` (`.good .warn`).
Ring: `<svg class="ring" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="52" stroke-width="12"></circle><circle class="bar" cx="60" cy="60" r="52" stroke-width="12" stroke-dasharray="326.7" stroke-dashoffset="58.8" style="--len: 326.7"></circle></svg>` (offset = len × (1 − pct); colour via `style="stroke: var(--sys-green)"`).
Upload/OCR: `.dropzone(.is-over) .file-row > .name(.truncates) .meta .shimmer .scanline .skeleton`.
Provenance (core concept): `.src` + `.src-verified` (2+ docs agree) `.src-extracted` (one doc) `.src-conflict` `.src-confirmed` `.src-missing`; `.field.is-extracted/.is-conflict/.is-missing`; `.candidate(.is-picked)`.
Callouts `.note .note-info/good/warn/bad/brand` with leading `.ic` (no left-border stripes). Dates `.date-tile > .m + .d (.is-urgent)`.
Overlays `.scrim .sheet(--origin) .sheet-grabber .dialog .dialog-body .dialog-actions .popover .menu-item .toast .tooltip`.
Motion `.rise(style="--d:N") .fade .enter-forward .enter-back .pop .press .sheet-side .sheet-bottom`. Marketing `.nav-float .nav-link .section .section-head .feature-media .price`.
Icons `<span class="ic ic-NAME" aria-hidden="true"></span>` (`.ic-sm .ic-lg .ic-xl`). NAMEs:
home layout-dashboard building building-bank building-community users user user-plus user-check file file-text files folder folder-open
upload download cloud-upload calendar calendar-event clock check circle-check x circle-x alert-triangle alert-circle info-circle help-circle
chevron-right chevron-left chevron-down chevron-up arrow-right arrow-left arrow-up-right plus minus search bell settings logout shield-check
shield-lock scale briefcase sparkles scan eye pencil trash dots filter arrows-sort mail phone map-pin id key lock link external-link share
hierarchy-2 chart-pie chart-bar activity list-check clipboard-check receipt globe sun moon menu-2 refresh cloud-check message-circle book book-2
coins percentage heart-handshake tree users-group file-certificate signature writing gavel license certificate file-search progress-check
circle-dashed point layout-sidebar command device-mobile lifebuoy file-upload file-invoice report-analytics checklist calendar-due flag home-2
building-store user-shield stack-2 cash adjustments-horizontal copy printer history eye-off qrcode file-alert notes clipboard-list
rotate-clockwise world target timeline

---------------------------------------------------------------------------
## 3. Apple rules you must visibly apply

- One primary action per view; clear hierarchy.
- Wayfinding: current nav/tab/step marked; back/close/Save & exit present.
- Feedback: status, completion, warning, error; inline validation; saving state; OCR progress.
- Grouping & mapping; direct specific labels ("Upload CR12", "Confirm 3 directors").
- Glass only on navigation layer (sidebar, top bar, floating action bar, tab bar, sheets).
- Motion: `.rise` entrances with small staggers (≤8); springs from the stylesheet; sheets/popovers originate at trigger (`--origin`);
  enter/exit same path (forward = from right, back = from left). Nothing loops except real progress.
- Touch ≥44px at phone width. Restraint: no gradient washes, emoji, left-border cards, decorative blobs; burgundy is an accent.
- Tabular numerals for money, counts, dates, percentages.

---------------------------------------------------------------------------
## 4. Canonical shells — copy VERBATIM, change only the marked bits

### 4a. App shell (business owner) — Dashboard, Workspace*, Services, Overlays, NewFiling

```html
<div class="shell">
  <aside class="sidebar glass-chrome" aria-label="Main navigation">
    <a class="sb-brand" href="Dashboard.dc.html">
      <img src="/_blob/a2c8945f1f7196abaa7009dd14de1c46" alt="" style="width: 30px; height: 30px">
      <span class="sb-word">LexReg<small>Africa</small></span>
    </a>
    <button class="sb-search" type="button"><span class="ic ic-search ic-sm" aria-hidden="true"></span>Search<span class="kbd">⌘K</span></button>
    <a class="sb-item" href="Dashboard.dc.html"><span class="ic ic-layout-dashboard" aria-hidden="true"></span>Overview</a>
    <a class="sb-item" href="Workspace.dc.html"><span class="ic ic-building" aria-hidden="true"></span>Entities<span class="pill">4</span></a>
    <a class="sb-item" href="WsCompliance.dc.html"><span class="ic ic-calendar-due" aria-hidden="true"></span>Compliance<span class="badge">2</span></a>
    <a class="sb-item" href="WsDocuments.dc.html"><span class="ic ic-folder" aria-hidden="true"></span>Documents</a>
    <a class="sb-item" href="Services.dc.html"><span class="ic ic-briefcase" aria-hidden="true"></span>Services</a>
    <div class="sb-group">Support</div>
    <a class="sb-item" href="Overlays.dc.html"><span class="ic ic-lifebuoy" aria-hidden="true"></span>Get help</a>
    <a class="sb-item" href="Dashboard.dc.html"><span class="ic ic-settings" aria-hidden="true"></span>Settings</a>
    <div class="sb-foot">
      <span class="avatar avatar-sm">WM</span>
      <div class="grow"><p class="t-subhead truncate" style="color: var(--label)">Wanjiku Mwangi</p><p class="t-caption t-3 truncate">Business owner</p></div>
      <button class="btn btn-plain btn-icon btn-sm" type="button" aria-label="Log out"><span class="ic ic-logout" aria-hidden="true"></span></button>
    </div>
  </aside>
  <div class="main">
    <header class="topbar">
      <nav class="crumbs" aria-label="Breadcrumb"> <!-- CHANGE: your breadcrumb --> </nav>
      <div class="grow"></div>
      <button class="btn btn-gray btn-icon btn-pill" type="button" aria-label="Notifications"><span class="ic ic-bell" aria-hidden="true"></span></button>
      <a class="btn btn-tinted btn-pill" href="Overlays.dc.html"><span class="ic ic-message-circle" aria-hidden="true"></span>Ask a lawyer</a>
    </header>
    <div class="m-topbar glass">
      <a class="row gap-2" href="Dashboard.dc.html" style="color: var(--label); text-decoration: none"><img class="brand-logo" src="/_blob/a2c8945f1f7196abaa7009dd14de1c46" alt="" style="width: 26px; height: 26px"><span class="t-headline"><!-- CHANGE: short page title --></span></a>
      <div class="row gap-1"><button class="btn btn-plain btn-icon" type="button" aria-label="Search"><span class="ic ic-search" aria-hidden="true"></span></button><span class="avatar avatar-sm">WM</span></div>
    </div>
    <main class="content">
      <!-- CHANGE: page content -->
    </main>
    <nav class="m-tabbar glass" aria-label="Tabs">
      <a class="m-tab" href="Dashboard.dc.html"><span class="ic ic-layout-dashboard" aria-hidden="true"></span>Overview</a>
      <a class="m-tab" href="Workspace.dc.html"><span class="ic ic-building" aria-hidden="true"></span>Entities</a>
      <a class="m-tab" href="WsCompliance.dc.html"><span class="ic ic-calendar-due" aria-hidden="true"></span>Compliance</a>
      <a class="m-tab" href="WsDocuments.dc.html"><span class="ic ic-folder" aria-hidden="true"></span>Documents</a>
      <a class="m-tab" href="Services.dc.html"><span class="ic ic-briefcase" aria-hidden="true"></span>Services</a>
    </nav>
  </div>
</div>
```
Add `is-on` to the ONE current `.sb-item` and `.m-tab` (Workspace boards → Entities; WsCompliance → Compliance; WsDocuments → Documents).

### 4b. Wizard shell — every New* (except NewFiling) and Ex* board

```html
<div class="wz">
  <header class="wz-top glass">
    <a class="row gap-2" href="Dashboard.dc.html" style="color: var(--label); text-decoration: none"><img class="brand-logo" src="/_blob/a2c8945f1f7196abaa7009dd14de1c46" alt="" style="width: 28px; height: 28px"><span class="t-headline hide-compact">LexReg</span></a>
    <span class="t-3 hide-compact" aria-hidden="true">/</span>
    <span class="t-subhead truncate"><!-- CHANGE: "Register a new entity · Jua Kali Foods Ltd" or "Onboard an existing entity · Amani Logistics Limited" --></span>
    <div class="grow"></div>
    <span class="wz-saved"><span class="ic ic-cloud-check" aria-hidden="true"></span><span class="hide-compact">Draft saved · just now</span></span>
    <a class="btn btn-gray btn-sm" href="Dashboard.dc.html">Save &amp; exit</a>
  </header>
  <div class="wz-body">
    <nav class="wz-rail" aria-label="Steps">
      <p class="t-eyebrow" style="padding: 0 10px 8px">Steps</p>
      <!-- CHANGE: one .wz-step per step: done+board: <a class="wz-step is-done" href="NewType.dc.html"><span class="n">1</span>Entity type</a>
           current: <a class="wz-step is-on" aria-current="step" href="THIS.dc.html">…</a>; upcoming or no board: <span class="wz-step">…</span>
           (done without board: <span class="wz-step is-done">); not applicable: add is-skipped -->
    </nav>
    <section class="wz-main">
      <div class="wz-progress">
        <div class="row between"><span class="t-caption t-3">Step 6 of 14</span><span class="t-caption t-3">43%</span></div>
        <div class="progress"><span style="width: 43%"></span></div>
      </div>
      <header class="wz-head rise">
        <p class="t-eyebrow">Step 6 of 14</p>
        <h1 class="t-large"><!-- CHANGE: step title --></h1>
        <p class="t-body t-2 t-pretty"><!-- CHANGE: one-sentence purpose --></p>
      </header>
      <!-- CHANGE: step content -->
      <div class="wz-actions glass">
        <a class="btn btn-gray" href="PREVIOUS.dc.html"><span class="ic ic-arrow-left" aria-hidden="true"></span>Back</a>
        <span class="spacer"></span>
        <span class="t-footnote t-3 hide-compact"><!-- optional: "3 fields need attention" --></span>
        <a class="btn btn-primary" href="NEXT.dc.html">Continue<span class="ic ic-arrow-right" aria-hidden="true"></span></a>
      </div>
    </section>
  </div>
</div>
```
New-entity steps (limited company): 1 Entity type · 2 Applicant & contact · 3 Name reservation · 4 Company basics · 5 Share structure ·
6 Shareholders & members · 7 Directors & partners · 8 Beneficial ownership · 9 Company secretary · 10 Constitutional documents ·
11 Document vault · 12 Employee information · 13 Declaration & consent · 14 Review & submit.
Board links: 1 NewType · 2 NewApplicant · 3 NewName · 5 NewShares · 6–7 NewPeople · 8 NewOwnership · 11 NewVault · 13 NewDeclaration · 14 NewReview.
Steps 4, 9, 10, 12 have no board (spans). NewReview Continue → NewFiling.
Ex* flow onboards **Amani Logistics Limited** (7 steps): 1 ExType · 2 ExUpload · 3 ExDetails · 4 ExPeople · 5 Beneficial ownership (span) ·
6 ExBaseline · 7 ExReview. Chain: ExType → ExUpload → ExDetails → ExPeople → ExBaseline → ExReview → Workspace.
EXCEPTION — ExInstrument: governing-instrument step for **Tumaini Welfare Society** with society rail: 1 Entity type · 2 Upload documents ·
3 Entity details · 4 Officers & members · 5 Constitution (current) · 6 Compliance baseline · 7 Review & activate (earlier steps done spans).
Its Back → Dashboard.dc.html, Continue → ExBaseline.dc.html.

### 4c. Admin shell (Charles, super admin) — Admin, AdminEntities, AdminEntity
Same structure as 4a; sidebar (Zeno AdminSidebar grouping): brand "LexReg" with `<small>Admin</small>`; items: Overview (Admin.dc.html, ic-layout-dashboard),
Entities (AdminEntities.dc.html, ic-building, pill count), Service requests (ic-briefcase, badge), Lawyers (ic-gavel); group "Platform": Users (ic-users),
Payments (ic-cash), Audit log (ic-history), Insights CMS (ic-book-2); group "Switch": Owner view (Dashboard.dc.html, ic-arrow-left).
Non-board items link to Admin.dc.html. Footer: avatar "CH", "Charles", "Super admin". Mobile tabs: Overview, Entities, Requests, Lawyers, More.

### 4d. Lawyer shell — no sidebar; `.topbar glass` with logo, "Assigned matter" crumb, lawyer avatar AO; content max-width 1100 centred.
Lawyers see ONE entity + ONE service — make scoping visible.

### 4e. Marketing nav — Home, Insight, Legal
`<header class="container" style="padding-top: 16px"><nav class="nav-float glass" aria-label="Primary">` logo + "LexReg", links (How it works, Services,
Pricing, Insights, FAQ) `.nav-link hide-compact`, spacer, `<a class="nav-link" href="SignIn.dc.html">Sign in</a>`,
`<a class="btn btn-primary btn-pill btn-sm" href="SignUp.dc.html">Get started</a>`.

---------------------------------------------------------------------------
## 5. Content rules & shared sample data

- Real LexReg copy, step names, labels, documents and rules from the source. Vision touches that fit are welcome.
- No lorem, invented stats, testimonials, logos or prices → placeholders [PRICE], [CLIENT QUOTE], [PARTNER LOGO]. Known: Legal audit KES 25,000.
- BRS has NO API: no live name checks, no automatic filing. User files on eCitizen and uploads certificate. OCR threshold 60%. Drafts always save.
- Kenya: KES, KRA PIN (A012345678Z individual, P051234567X company), 8-digit ID, BRS/eCitizen, CR1 CR2 CR8 CR12 BOF-1 BN2, Companies Act 2015, DPA 2019, counties.
- Sample data:
  - Owner: Wanjiku Mwangi (WM), wanjiku@amanilogistics.co.ke, +254 712 345 678.
  - **Amani Logistics Limited** — private limited company, PVT-2LU7Q9XB, KRA PIN P051234567X, incorporated 14 March 2019, Mombasa Road, Industrial Area,
    Nairobi (P.O. Box 48211-00100), Nairobi County. Nominal capital KES 1,000,000 (1,000 ordinary shares of KES 1,000). Health 82%. Active.
    Wanjiku Mwangi — director & shareholder 600 (60%), ID 23456789, PIN A012345678Z; Brian Otieno — director & shareholder 300 (30%), ID 29876543,
    PIN A019876543K; Savannah Holdings Limited — corporate shareholder 100 (10%), PVT-9QK3LM2A; Halima Abdi — company secretary (CPS).
    BOs: Wanjiku 60% direct, Brian 30% direct, James Kariuki 10% indirect via Savannah Holdings.
    Upcoming: annual return due 13 Apr 2027; KRA corporate tax return; Nairobi County business permit 31 Mar 2027.
    Tasks: "Upload signed BOF-1"; "Confirm Brian Otieno's KRA PIN" (CR12 A019876543K vs KRA certificate A019876534K).
  - **Kilele Partners** — general partnership, BN-8XK2Q4LM, partners Wanjiku Mwangi & Peter Njoroge. Active.
  - **Tumaini Welfare Society** — society, existing onboarding in progress (60%).
  - Draft **Jua Kali Foods Ltd** — new company, step 6 of 14, saved 2 days ago.
  - Today: Friday 16 October 2026. Lawyer: Adv. Achieng Odhiambo (AO), matter: Legal audit — Amani Logistics Limited. Super admin: Charles (CH).

---------------------------------------------------------------------------
## 6. Board list (link only to these, as `<Name>.dc.html`)

Main · Foundations · Components · Motion · Home · Insight · Legal · Phone-Home · SignIn · SignUp · ResetPassword · LawyerInvite ·
PathSelector · Readiness · ReadinessResult · NewType · NewApplicant · NewName · NewShares · NewPeople · NewOwnership · NewVault · NewDeclaration ·
NewReview · NewFiling · Phone-NewPeople · ExType · ExUpload · ExDetails · ExPeople · ExInstrument · ExBaseline · ExReview · Phone-ExUpload ·
Dashboard · Workspace · WsStructure · WsPeople · WsCompliance · WsDocuments · Overlays · Services · Phone-Dashboard · Phone-Workspace ·
Admin · AdminEntities · AdminEntity · Lawyer   (Phone-* and Main are written by the orchestrator — do not write them.)

Workspace tab boards share one header: entity name, type pill, status pill, reg. no., quick actions; then `.tabs`: Overview → Workspace,
Structure → WsStructure, People → WsPeople, Compliance → WsCompliance, Documents → WsDocuments (is-on on current).
Topbar breadcrumb: `Entities / Amani Logistics Limited / <Tab>`.

---------------------------------------------------------------------------
## 7. Quality bar

Charles (the lawyer client) will react to this. Each screen: finished, shipped, Apple-quality — real data, real states, nothing half-drawn.
Fewer, better elements. Must render right at 1440 AND 390 wide. Interactive bits must work in Play.
