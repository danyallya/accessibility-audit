import { describe, expect, it } from 'vitest';
import { createAuditRun, localDateTimeValue, normalizePublicPageUrl, parseLocalDateTime, validateAuditRun, type AuditRunInput } from './audit-run';

const now = new Date('2026-10-28T10:00:00.000Z');
const validInput: AuditRunInput = {
  targetUrl: '  https://EXAMPLE.com/accessibility  ',
  ruleId: 'color-contrast',
  severity: 'serious',
  remediationHint: 'Increase text contrast against the page background.',
  startedAtLocal: localDateTimeValue(new Date(now.getTime() - 60_000)),
  completedAtLocal: localDateTimeValue(now),
};

describe('audit-run records', () => {
  it('normalizes a public URL and stores a dated run with its remediation detail', () => {
    const record = createAuditRun(validInput, 'local-run-1', now);

    expect(record).toEqual({
      id: 'local-run-1',
      createdAt: now.toISOString(),
      targetUrl: 'https://example.com/accessibility',
      ruleId: 'color-contrast',
      severity: 'serious',
      remediationHint: 'Increase text contrast against the page background.',
      startedAt: new Date(now.getTime() - 60_000).toISOString(),
      completedAt: now.toISOString(),
    });
  });

  it('rejects credentials, private-address shapes, non-HTTPS, query strings and fragments', () => {
    for (const targetUrl of [
      'http://example.com',
      'https://user:secret@example.com',
      'https://localhost',
      'https://127.0.0.1',
      'https://192.168.1.2',
      'https://example.local',
      'https://example.com:8443',
      'https://example.com/page?token=secret',
      'https://example.com/page?',
      'https://example.com/page#private',
      'https://example.com/page#',
    ]) {
      expect(validateAuditRun({ ...validInput, targetUrl }, now).map((issue) => issue.field)).toContain('targetUrl');
    }
  });

  it('requires a rule, supported severity and a concise remediation hint', () => {
    expect(validateAuditRun({ ...validInput, ruleId: 'Rule label with spaces' }, now).map((issue) => issue.field)).toContain('ruleId');
    expect(validateAuditRun({ ...validInput, severity: 'blocker' as AuditRunInput['severity'] }, now).map((issue) => issue.field)).toContain('severity');
    expect(validateAuditRun({ ...validInput, remediationHint: '   ' }, now).map((issue) => issue.field)).toContain('remediationHint');
    expect(validateAuditRun({ ...validInput, remediationHint: 'x'.repeat(501) }, now).map((issue) => issue.field)).toContain('remediationHint');
  });

  it('rejects malformed, impossible, future and reversed run times', () => {
    expect(parseLocalDateTime('2026-02-30T10:00')).toBeNull();
    expect(validateAuditRun({ ...validInput, startedAtLocal: 'not-a-time' }, now).map((issue) => issue.field)).toContain('startedAtLocal');
    expect(validateAuditRun({ ...validInput, completedAtLocal: localDateTimeValue(new Date(now.getTime() + 60_000)) }, now).map((issue) => issue.field)).toContain('completedAtLocal');
    expect(validateAuditRun({ ...validInput, startedAtLocal: localDateTimeValue(now), completedAtLocal: localDateTimeValue(new Date(now.getTime() - 60_000)) }, now).map((issue) => issue.field)).toContain('completedAtLocal');
  });

  it('allows equal start and completion boundaries and serializes without reporter identity', () => {
    const boundaryInput = { ...validInput, startedAtLocal: localDateTimeValue(now), completedAtLocal: localDateTimeValue(now) };
    expect(validateAuditRun(boundaryInput, now)).toEqual([]);

    const record = createAuditRun(boundaryInput, 'local-run-2', now);
    const restored = JSON.parse(JSON.stringify(record));
    expect(restored).toEqual(record);
    expect(restored).not.toHaveProperty('reporterName');
    expect(restored).not.toHaveProperty('email');
    expect(restored).not.toHaveProperty('credentials');
  });

  it('canonicalizes the URL without query or personal credential components', () => {
    expect(normalizePublicPageUrl('https://EXAMPLE.com/a11y')).toBe('https://example.com/a11y');
  });
});
