export const MAX_URL_LENGTH = 2048;
export const MAX_RULE_ID_LENGTH = 80;
export const MAX_REMEDIATION_LENGTH = 500;

export const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'] as const;
export type AuditSeverity = (typeof SEVERITIES)[number];

export type AuditRunInput = {
  targetUrl: string;
  ruleId: string;
  severity: AuditSeverity;
  remediationHint: string;
  startedAtLocal: string;
  completedAtLocal: string;
};

export type AuditRun = Omit<AuditRunInput, 'startedAtLocal' | 'completedAtLocal' | 'targetUrl' | 'ruleId'> & {
  id: string;
  createdAt: string;
  targetUrl: string;
  ruleId: string;
  startedAt: string;
  completedAt: string;
};

export type AuditRunField = keyof AuditRunInput;
export type AuditRunIssue = { field: AuditRunField; message: string };

const severityValues: readonly string[] = SEVERITIES;
const ruleIdPattern = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
const reservedHosts = new Set(['localhost', 'localhost.localdomain']);

export function localDateTimeValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}

export function normalizePublicPageUrl(value: string): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const labels = hostname.split('.');
  const isIpLiteral = hostname.includes(':') || /^\d+(?:\.\d+){3}$/.test(hostname);
  const hasInvalidDomainLabel = labels.some((label) => !label || label.startsWith('-') || label.endsWith('-'));
  const isReservedDomain = hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost') || hostname.endsWith('.test') || hostname.endsWith('.invalid') || hostname.endsWith('.example');

  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || /[?#]/.test(trimmed)) return null;
  if (reservedHosts.has(hostname) || isIpLiteral || isReservedDomain || labels.length < 2 || hasInvalidDomainLabel) return null;

  return url.href;
}

export function validateAuditRun(input: AuditRunInput, now = new Date()): AuditRunIssue[] {
  const issues: AuditRunIssue[] = [];

  if (!normalizePublicPageUrl(input.targetUrl)) {
    issues.push({ field: 'targetUrl', message: 'Enter a public HTTPS page URL without credentials, query parameters or a fragment.' });
  }

  const ruleId = typeof input.ruleId === 'string' ? input.ruleId.trim() : '';
  if (!ruleId) issues.push({ field: 'ruleId', message: 'Enter the accessibility rule identifier.' });
  else if (ruleId.length > MAX_RULE_ID_LENGTH || !ruleIdPattern.test(ruleId)) {
    issues.push({ field: 'ruleId', message: 'Use up to 80 letters, numbers, dots, underscores or hyphens.' });
  }

  if (!severityValues.includes(input.severity)) {
    issues.push({ field: 'severity', message: 'Choose a supported severity.' });
  }

  const hint = typeof input.remediationHint === 'string' ? input.remediationHint.trim() : '';
  if (!hint) issues.push({ field: 'remediationHint', message: 'Add a concise remediation hint.' });
  else if (hint.length > MAX_REMEDIATION_LENGTH) {
    issues.push({ field: 'remediationHint', message: 'Use 500 characters or fewer.' });
  }

  const startedAt = parseLocalDateTime(input.startedAtLocal);
  const completedAt = parseLocalDateTime(input.completedAtLocal);
  if (!startedAt) issues.push({ field: 'startedAtLocal', message: 'Enter a valid local start time.' });
  if (!completedAt) issues.push({ field: 'completedAtLocal', message: 'Enter a valid local completion time.' });
  if (!Number.isFinite(now.getTime())) {
    issues.push({ field: 'startedAtLocal', message: 'The device clock is unavailable.' });
  } else {
    if (startedAt && startedAt.getTime() > now.getTime()) {
      issues.push({ field: 'startedAtLocal', message: 'Start time cannot be in the future.' });
    }
    if (completedAt && completedAt.getTime() > now.getTime()) {
      issues.push({ field: 'completedAtLocal', message: 'Completion time cannot be in the future.' });
    }
  }
  if (startedAt && completedAt && completedAt.getTime() < startedAt.getTime()) {
    issues.push({ field: 'completedAtLocal', message: 'Completion time must be at or after the start time.' });
  }

  return issues;
}

export function createAuditRun(input: AuditRunInput, id: string, now = new Date()): AuditRun {
  if (validateAuditRun(input, now).length) throw new Error('Cannot save an audit record from invalid input.');
  const normalizedId = typeof id === 'string' ? id.trim() : '';
  if (!normalizedId) throw new Error('A local audit record identifier is required.');

  return {
    id: normalizedId,
    createdAt: now.toISOString(),
    targetUrl: normalizePublicPageUrl(input.targetUrl)!,
    ruleId: input.ruleId.trim(),
    severity: input.severity,
    remediationHint: input.remediationHint.trim(),
    startedAt: parseLocalDateTime(input.startedAtLocal)!.toISOString(),
    completedAt: parseLocalDateTime(input.completedAtLocal)!.toISOString(),
  };
}
