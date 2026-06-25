# Supabase Region: eu-central-1 (Frankfurt)

**Decision Date:** 2025-06-25
**Decision Maker:** Ian Love
**Context:** Setting up the LexReg Africa project database on Supabase

## Why Frankfurt (eu-central-1)

| Factor | Frankfurt | Alternatives Considered |
|--------|-----------|------------------------|
| **Latency to Kenya** | ~180–200ms | London ~170–190ms, US East ~250–300ms |
| **Data Protection** | Full GDPR — strongest compliance posture | London (UK GDPR), US East (requires SCCs) |
| **Kenya DPA 2019** | EU adequacy explicitly recognized | US requires extra legal work |
| **Supabase Support** | General region (recommended tier) | — |

## Key Reasoning

1. **Closest available region.** Supabase has no African region yet (Cape Town `af-south-1` has been requested but is not available as of mid-2026).

2. **Legal compliance for a Kenyan legal-tech platform.** LexReg handles sensitive corporate governance data: director details, shareholder registers, KRA PINs, legal documents, and compliance records. Kenya's Data Protection Act 2019 requires "adequate safeguards" for offshore data processing. The EU's GDPR is explicitly recognized as adequate by Kenya's data protection framework.

3. **Latency is acceptable.** ~180–200ms is perfectly fine for a governance/compliance platform — not a real-time trading or gaming app. The user experience impact is negligible compared to the compliance benefit.

4. **Future migration path.** When Supabase eventually launches an African region, we can migrate. Migration requires creating a new project and moving data, but it is technically possible.

## Alternatives Rejected

- **US East (us-east-1):** Higher latency (~250–300ms) and weaker data protection alignment for Kenya. Would require additional Standard Contractual Clauses (SCCs) and legal documentation.
- **London (eu-west-2):** Slightly lower latency but no meaningful compliance advantage over Frankfurt. Frankfurt is the general recommended region for EU.
- **Self-host in Nairobi:** Would keep data on the continent but adds significant DevOps overhead (VPS management, backups, security patching) that contradicts the solo-dev efficiency goal.

## Action Taken

Supabase project will be provisioned in `eu-central-1` (Frankfurt, Central EU).

## References

- Kenya Data Protection Act 2019, Section 48 (transfer of personal data outside Kenya)
- Supabase Docs: Available Regions
