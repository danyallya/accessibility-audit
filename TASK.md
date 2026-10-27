# Active task

**ID:** A11Y-AUDIT-001  
**Title:** Store a scan run with URL, rule, severity and remediation hint.

## Context

The technical shell exists; the product workflow does not. Build the first safe, end-to-end domain slice for Accessibility Audit.

## Acceptance criteria

- Type the audit-runs domain record, validation rules and lifecycle.
- Add a create/review flow that works without a server round-trip.
- Persist a draft with Dexie and show saved, unsaved and sync state truthfully.
- Test valid/invalid input, date/order boundaries and serialization.
- Document retention, deletion and limitations of the offline slice.
- Respect this guardrail: Automated scan is not certification; limit scope/rate and explain manual review gaps.

## Status

Not started. Use scan/001-a11y-audit. After acceptance passes, update progress and set the next task.
