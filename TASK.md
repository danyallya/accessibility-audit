# Active task

**ID:** A11Y-AUDIT-003
**Title:** Add PostgreSQL migrations and repository tests for audit records.

## Context

The first local record flow is implemented for A11Y-AUDIT-001/002 on PR #7. It records manually entered findings; no page scanner or certification exists. The PR is stacked on preparation PR #6 and is not merged.

## Acceptance criteria

- Add ordered SQL migrations for audit runs, public page URL, finding rule, severity and remediation hint.
- Add repository methods with parameterized SQL and useful test coverage.
- Keep stored records free of URL credentials, query parameters and fragments.
- Define deletion and retention behavior; do not add user identity or an unreviewed scan claim.
- Run migration and repository checks against the local PostgreSQL service.

## Previous slice status

A11Y-AUDIT-001 and A11Y-AUDIT-002 have a local implementation in [PR #7](https://github.com/danyallya/accessibility-audit/pull/7). Final-head local and GitHub verification passed; the PR awaits review/merge. It saves a locally entered URL, rule identifier, severity, remediation hint and ordered run times; validates public HTTPS-shaped URLs and time bounds; persists drafts and records in Dexie; and offers review, empty/error states and confirmed deletion. It does not visit or scan the URL. See `docs/days/day-001.md` for evidence and carryovers.

After PR #6 merges with authorization, retarget PR #7 to `main` before opening a separate task branch for A11Y-AUDIT-003.
