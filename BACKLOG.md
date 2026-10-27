# Backlog

Prioritize user risk and evidence over polish. Estimates are focused engineering days for a reviewed MVP and exclude external approvals.

## P0 — safe foundation

- [ ] A11Y-AUDIT-001 — Record a manually entered public-page audit run with URL, rule, severity and remediation hint; implementation is under review in the day 1 feature PR. No page scan is performed.
- [ ] A11Y-AUDIT-002 — Validate audit records and add empty/error/deletion states; implementation is under review in the day 1 feature PR.
- [ ] A11Y-AUDIT-003 — Add PostgreSQL migrations and repository tests.
- [ ] A11Y-AUDIT-004 — Specify offline conflicts, retry, duplicate-submit and recovery.

## P1 — product flow

- [ ] A11Y-AUDIT-005 — Implement: Scan a public page, explain findings and let owners rerun the audit.
- [ ] A11Y-AUDIT-006 — Add access, consent, audit and export rules.
- [ ] A11Y-AUDIT-007 — Complete responsive, keyboard and accessibility review.

## P2 — release

- [ ] A11Y-AUDIT-008 — Add end-to-end connectivity and primary-flow tests.
- [ ] A11Y-AUDIT-009 — Add deployment, backup/restore rehearsal and runbook.
- [ ] A11Y-AUDIT-010 — Release after domain and privacy review.

Estimated MVP after foundation: 8-14 focused engineering days; discovery/integrations may extend it.
