# LexReg AI — data protection note (Kenya DPA 2019)

Draft for Charles to review. Describes what LexReg AI sends where, and the controls around it.

## What the AI features do
| Feature | Who can use it | What it reads | Output |
|---|---|---|---|
| Ask Your Filings | Business owner, assigned lawyer, LexReg admin | One entity's register, document text (OCR fields), deadlines, saved facts | An answer on screen |
| LexAudit | LexReg admin, assigned lawyer | Same, for one entity | A draft report that a lawyer must edit and sign before the client sees it |
| Lawyer Co-Pilot | Assigned lawyer, LexReg admin | Same, for one entity | A briefing for the lawyer only |

## What leaves LexReg
- **Processor:** Groq (model inference). Models: `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`.
- **Sent per request:** the question, the instructions, and the records the AI looks up for that one entity, including **personal data** (names, ID numbers, KRA PINs, shareholdings, addresses where present).
- **Not sent:** document files themselves, passwords, payment details, other entities' records.
- **No Gemini fallback** for AI answers: Google's free tier may use inputs for training.

## Controls
- **Zero Data Retention** must be switched on in the Groq console (Settings → Data controls). *Action: confirm it is on.*
- **Access control:** every lookup runs on the signed-in user's own session, so database row-level security limits it to what that user may already see. Each tool is locked to one entity.
- **Review gate:** AI-drafted legal audit reports reach a client only after a lawyer signs them.
- **Logging:** every run is recorded in `ai_runs` (who, entity, model, tokens, outcome) and in `audit_logs`; admin view at /admin/ai.
- **Limits:** `AI_DAILY_RUN_CAP` per organisation per day (default 50); `AI_ENABLED=false` switches all AI off immediately.
- **Prompt-injection defence:** document text is treated as data; the model is told never to follow instructions inside it or reveal its instructions. Tested with `npm run ai:eval`.
- **Retention:** AI tables follow the platform rule: soft delete only, with the same retention as the records they come from.

## Still to do before paid launch
1. Confirm ZDR is on, and record Groq's data-processing terms and where processing happens (cross-border transfer under DPA 2019 s.48–50).
2. Update the Privacy Policy to name AI processing and Groq as a processor.
3. Replace the placeholder audit checklist with Charles's.
4. Run `npm run ai:eval` after any prompt or model change; keep known-gap test entities for regression.
