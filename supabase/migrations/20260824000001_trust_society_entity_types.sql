-- LexReg Africa — Trust & Society entity types
-- Fourth and fifth reference implementations of the formation engine.
-- Charles specs: "LexReg Africa Trust Formation Workflow" and "Society —
-- New Entity Formation Workflow", 2026-08.
--
-- No new tables. Both workflows reuse the existing LLC-shaped person
-- tables with different field semantics, same pattern already
-- established for partnership/sole proprietorship:
--   Trust:   Settlor -> beneficial_owners · Trustee -> directors ·
--            Beneficiaries -> shareholders · Protector/Trust Property ->
--            onboarding_data (single/settings objects, not repeating
--            registers requiring their own table)
--   Society: Officers -> directors · Members -> shareholders ·
--            Governing Committee/Property -> onboarding_data
--
-- 'trust' already exists on entity_type in the live database (added
-- directly, outside a checked-in migration, ahead of this Trust
-- workflow build) — added here too via IF NOT EXISTS so this migration
-- documents that value and is safe to run against a database that
-- doesn't have the drift.

alter type public.entity_type add value if not exists 'trust';
alter type public.entity_type add value if not exists 'society';

-- applicant_relationship only had promoter/director/shareholder/advocate/
-- authorised_agent — none fit a partner, proprietor, settlor, trustee,
-- society member, or society officer filing their own application.
alter type public.applicant_relationship add value if not exists 'partner';
alter type public.applicant_relationship add value if not exists 'proprietor';
alter type public.applicant_relationship add value if not exists 'settlor';
alter type public.applicant_relationship add value if not exists 'trustee';
alter type public.applicant_relationship add value if not exists 'member';
alter type public.applicant_relationship add value if not exists 'officer';
