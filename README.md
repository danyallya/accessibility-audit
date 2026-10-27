# Accessibility Audit

A readable website audit for contrast, keyboard use and common accessibility barriers.

Scan a public page, explain findings and let owners rerun the audit.

> Status: the first local audit-record prototype is under review. It stores a user-entered rule, severity and remediation hint for a public-page reference. It does not fetch pages, run automated scans or certify accessibility.

## Start locally

- Node.js 24 LTS and Docker Desktop with Compose.
- Copy .env.example to .env and set a development password.
- Install with `npm ci` using the committed lockfile.
- Start with docker compose up --build.
- App: http://localhost:3106 · PostgreSQL: localhost:5546

For lower-bandwidth installs, use [Offline Dev Vault](https://github.com/danyallya/offline-dev-vault); see docs/DEPENDENCIES.md.

## Foundation

Next.js App Router, TypeScript, React, Tailwind CSS, React Icons, PostgreSQL, Docker Compose, PWA manifest, conservative offline shell, Dexie/outbox starter, health endpoint, unit-test scaffold and CI. English interface.

The service worker caches only the public shell and versioned static files. It does not cache API responses or private data. The current local draft and audit records stay in this browser's IndexedDB until deleted or browser storage is cleared; they are not encrypted, synchronized or backed up. Accounts and a real page scanner are still planned.

Read AGENTS.md, TASK.md and docs/PROGRESS.md before work.
