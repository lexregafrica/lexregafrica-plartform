@AGENTS.md

# LexReg Africa — Claude Code Context

## Project Overview
Multi-tenant SaaS governance, compliance, and organisational readiness OS for Kenyan businesses. Client: Charles (lawyer). Developer: Ian Love (solo, vibe-coding with AI tools).

## Stack
- **Framework**: Next.js 16 (App Router, TypeScript strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS) — eu-central-1 Frankfurt
- **Forms**: React Hook Form + Zod v4 | **Tables**: TanStack Table | **Org charts**: @xyflow/react
- **OCR**: Google Document AI → Gemini Vision fallback → Manual
- **AI**: Anthropic Claude API (document drafting, audit reports)
- **Payments**: Paystack (M-Pesa, cards, bank) | **Notifications**: OneSignal + Resend
- **Hosting**: Vercel + Supabase

## Architecture Rules — NEVER BREAK THESE
1. Every table MUST have `organisation_id` — no exceptions
2. Every table MUST have RLS enabled
3. Soft delete only — set `deleted_at`, never hard delete (Kenya DPA 2019, 30-day retention)
4. Every action MUST write to `audit_logs` (who, what, when)
5. Lawyers see ONLY their assigned entity + service — zero cross-entity access
6. `super_admin` role is Charles only — never auto-assign

## Roles
- `super_admin` — Charles: sees all orgs, assigns lawyers, manages platform
- `business_owner` — Primary user: manages their own entities
- `lawyer` — External: scoped to one assigned entity + one service request via invite link

## Lawyer Invite Flow
Charles enters email → `supabase.auth.admin.inviteUserByEmail()` → lawyer gets magic link → sets own password → minimal dashboard. Charles NEVER sets or knows the password.

## Three Onboarding Paths
1. **Existing Entity** — upload docs → OCR (60% confidence threshold) → verify → dashboard
2. **New Entity** — questionnaire → collect ALL docs upfront → IDP → BRS manual filing → upload cert
3. **Informal Business** — 15-question readiness assessment → maturity score 0–100 → gap analysis

## Three Paid Pillars
1. Entity Formation & Registration | 2. Corporate Services (minutes, notices) | 3. Legal Audit (KES 25,000)

## BRS: NO API EXISTS
Hybrid manual only — system generates docs → user files at BRS → uploads certificate back. Never promise live BRS name checking.

## OCR: Save-as-draft always
User progress must never be lost. Every onboarding step saves to `entities.onboarding_data`.

## Commands
```bash
npm run dev       # Start dev server
npm run report    # Generate weekly progress report → open HTML → print to PDF
npm run db:types  # Regenerate TypeScript types from linked Supabase project
supabase db push  # Push migrations
```

## Skills to Apply (suggest proactively)
New UI → `/design-taste-frontend` | Animation → `/review-animations` | Ship screen → `/impeccable polish`
New feature → `/prd` then `/ralph` | Schema → `/database-schema-designer` | Security code → `/insecure-defaults`
