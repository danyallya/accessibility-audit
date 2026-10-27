import Dexie, { type Table } from 'dexie';
import type { AuditRun, AuditRunInput } from '@/domain/audit-run';

export type OutboxItem = { id: string; payload: unknown; createdAt: number; attempts: number; lastError?: string };
export type AuditRunDraft = { id: 'active'; data: AuditRunInput; updatedAt: string };

export class LocalDatabase extends Dexie {
  outbox!: Table<OutboxItem, string>;
  drafts!: Table<AuditRunDraft, string>;
  auditRuns!: Table<AuditRun, string>;

  constructor() {
    super('idea-accessibility-audit');
    this.version(1).stores({ outbox: 'id,createdAt,attempts' });
    this.version(2).stores({
      outbox: 'id,createdAt,attempts',
      drafts: 'id,updatedAt',
      auditRuns: 'id,targetUrl,createdAt,startedAt,completedAt,severity,ruleId',
    });
  }
}

export const localDatabase = new LocalDatabase();
