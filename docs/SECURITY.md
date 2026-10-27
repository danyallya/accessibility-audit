# Security and data policy

- Collect the minimum data; treat user content as private by default.
- No authentication, authorization, encryption-at-rest or production backup policy exists yet. Do not enter real sensitive data.
- Keep secrets in untracked .env; never expose DB/provider keys to browsers.
- Never cache APIs, authenticated pages or personal records in the service worker.
- Define export, deletion, retention, access logs and incident response before launch.
- Domain guardrail: Automated scan is not certification; limit scope/rate and explain manual review gaps.
- The local prototype accepts HTTPS URLs with domain-shaped hosts and rejects URL credentials, query parameters, fragments, IP literals and local/reserved hostnames. This format check cannot prove that a hostname is publicly reachable. The app does not fetch the URL. Remediation hints are free text stored in browser-local IndexedDB; do not enter personal, confidential or real sensitive data.
- Review threat model, roles and offline-device recovery before launch.
