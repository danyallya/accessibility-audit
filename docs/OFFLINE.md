# Offline behavior

PWA stores the public entry page, offline notice, icon and versioned static assets after the first visit. It never caches API responses or personalized records. The first audit-record slice saves its draft and user-entered findings in Dexie on this browser; it does not scan or fetch the referenced page. Data may be lost when browser storage is cleared and is not backed up, synchronized or encrypted by this prototype. Delete records explicitly before shared-device handoff. Cross-device sync, conflicts, encryption and retry UX remain unimplemented.
