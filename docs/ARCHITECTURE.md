# Architecture

- Web: Next.js App Router and server-only route handlers.
- UI: React, Tailwind CSS, React Icons, semantic HTML and explicit status; the local audit editor uses a client boundary for IndexedDB and form interactions.
- Offline: service worker for the public shell; Dexie v2 stores the active audit draft and manually entered audit records locally. There is no sync or page scanner.
- Database: PostgreSQL 18 in Compose; ordered SQL migrations under db/migrations.
- Domain belongs in src/domain; server access in src/server; view code in app.
- External providers use server-side adapters and environment-only secrets.
- Docker multi-stage build; isolated web/database services per project.

First product record: audit-runs. The local manually entered finding flow is implemented in the current review branch; next add PostgreSQL mapping and repository tests. Automated page scanning remains future work and must not be implied by the record UI.
