# Decision log

## 0001 — Independent repository

Each product owns its history, task queue and release boundary.

## 0002 — Shell cache is not offline product data

The service worker stores public shell only. Records need an explicit local schema, conflict policy and recovery review.

## 0003 — Verify provider terms before integration

External sources require verified official terms, attribution, server-side credentials and visible source timestamps.

## 0004 — First audit slice records user-entered findings

The first local workflow stores one user-entered rule, severity and remediation hint with a public HTTPS page reference and ordered run times. It never fetches or scans the page and never certifies accessibility. Query strings, fragments, credentials, IP literals and local/reserved hostnames are rejected to reduce accidental storage of secrets and private endpoints. Keep the draft and records in browser-local Dexie until explicit deletion; do not imply backup, encryption or synchronization.
