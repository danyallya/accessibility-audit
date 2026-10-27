'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { localDatabase, type AuditRunDraft } from '@/client-db';
import {
  createAuditRun,
  localDateTimeValue,
  validateAuditRun,
  type AuditRun,
  type AuditRunField,
  type AuditRunInput,
  type AuditRunIssue,
} from '@/domain/audit-run';

type DraftState = 'loading' | 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
const severities = ['critical', 'serious', 'moderate', 'minor'] as const;

function emptyInput(now = ''): AuditRunInput {
  return {
    targetUrl: '',
    ruleId: '',
    severity: 'moderate',
    remediationHint: '',
    startedAtLocal: now,
    completedAtLocal: now,
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function severityLabel(severity: AuditRun['severity']): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export default function HomePage() {
  const [input, setInput] = useState<AuditRunInput>(() => emptyInput());
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [deviceNow, setDeviceNow] = useState<Date | null>(null);
  const [draftState, setDraftState] = useState<DraftState>('loading');
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [issues, setIssues] = useState<AuditRunIssue[]>([]);
  const [storageError, setStorageError] = useState('');
  const [notice, setNotice] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const hydrated = useRef(false);
  const skipNextDraftSave = useRef(false);
  const draftSaveTimer = useRef<number | null>(null);
  const pendingDraftWrite = useRef<Promise<void> | null>(null);

  async function settleDraftWrite() {
    if (draftSaveTimer.current !== null) {
      window.clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = null;
    }
    await pendingDraftWrite.current;
  }

  async function refreshRuns() {
    const saved = await localDatabase.auditRuns.orderBy('createdAt').reverse().toArray();
    setRuns(saved);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [draft, saved] = await Promise.all([
          localDatabase.drafts.get('active'),
          localDatabase.auditRuns.orderBy('createdAt').reverse().toArray(),
        ]);
        if (cancelled) return;
        const loadedAt = new Date();
        setDeviceNow(loadedAt);
        if (draft) setInput(draft.data);
        else {
          skipNextDraftSave.current = true;
          setInput(emptyInput(localDateTimeValue(loadedAt)));
        }
        setRuns(saved);
        hydrated.current = true;
        setDraftState(draft ? 'saved' : 'idle');
      } catch {
        if (!cancelled) {
          hydrated.current = true;
          setDraftState('error');
          setStorageError('Local browser storage is unavailable. No audit record was saved.');
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    setDraftState('unsaved');
    const timer = window.setTimeout(() => {
      draftSaveTimer.current = null;
      const previousWrite = pendingDraftWrite.current;
      const write = (async () => {
        setDraftState('saving');
        try {
          await previousWrite;
          const draft: AuditRunDraft = { id: 'active', data: input, updatedAt: new Date().toISOString() };
          await localDatabase.drafts.put(draft);
          setDraftState('saved');
          setStorageError('');
        } catch {
          setDraftState('error');
          setStorageError('The draft could not be saved on this device.');
        }
      })();
      pendingDraftWrite.current = write;
      void write.finally(() => {
        if (pendingDraftWrite.current === write) pendingDraftWrite.current = null;
      });
    }, 450);
    draftSaveTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (draftSaveTimer.current === timer) draftSaveTimer.current = null;
    };
  }, [input]);

  function updateField(field: AuditRunField, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setIssues([]);
    setNotice('');
  }

  function startReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date();
    setDeviceNow(now);
    const nextIssues = validateAuditRun(input, now);
    setIssues(nextIssues);
    if (nextIssues.length) {
      document.getElementById(`field-${nextIssues[0].field}`)?.focus();
      return;
    }
    setStep('review');
  }

  async function saveAuditRun() {
    const now = new Date();
    setDeviceNow(now);
    const nextIssues = validateAuditRun(input, now);
    if (nextIssues.length) {
      setIssues(nextIssues);
      setStep('form');
      return;
    }

    setIsBusy(true);
    await settleDraftWrite();
    try {
      const run = createAuditRun(input, crypto.randomUUID(), now);
      await localDatabase.transaction('rw', localDatabase.auditRuns, localDatabase.drafts, async () => {
        await localDatabase.auditRuns.add(run);
        await localDatabase.drafts.delete('active');
      });
    } catch {
      setStorageError('The audit record could not be saved. The local draft is still available.');
      setDraftState('error');
      setIsBusy(false);
      return;
    }

    skipNextDraftSave.current = true;
    setInput(emptyInput(localDateTimeValue(now)));
    setIssues([]);
    setStep('form');
    setDraftState('idle');
    setIsBusy(false);
    setNotice('Audit record saved on this device only. No page was scanned or certified.');
    setStorageError('');
    try {
      await refreshRuns();
    } catch {
      setStorageError('The record was saved locally, but the list could not be refreshed. Reload to confirm it.');
    }
  }

  async function deleteAuditRun(id: string) {
    setIsBusy(true);
    try {
      await localDatabase.auditRuns.delete(id);
    } catch {
      setStorageError('The audit record could not be deleted from this device.');
      setIsBusy(false);
      return;
    }
    setPendingDelete(null);
    setNotice('Audit record deleted from this device.');
    setStorageError('');
    setIsBusy(false);
    try {
      await refreshRuns();
    } catch {
      setStorageError('The record was deleted locally, but the list could not be refreshed. Reload to confirm it.');
    }
  }

  async function discardDraft() {
    setIsBusy(true);
    await settleDraftWrite();
    try {
      await localDatabase.drafts.delete('active');
      skipNextDraftSave.current = true;
      const now = new Date();
      setDeviceNow(now);
      setInput(emptyInput(localDateTimeValue(now)));
      setIssues([]);
      setStep('form');
      setDraftState('idle');
      setStorageError('');
      setNotice('Draft discarded from this device.');
    } catch {
      setStorageError('The draft could not be discarded from this device.');
      setDraftState('error');
    }
    setIsBusy(false);
  }

  const issueFor = (field: AuditRunField) => issues.find((issue) => issue.field === field)?.message;
  const inputClass = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-60';
  const primaryButtonClass = 'rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryButtonClass = 'rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50';
  const maxLocalTime = deviceNow ? localDateTimeValue(deviceNow) : undefined;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">Accessibility Audit · local prototype</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Record an accessibility finding</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">Keep a local note about one rule on a public page. This form does not fetch, crawl or test the URL. A manual or automated finding is not a complete accessibility review or certification.</p>
        </header>

        <section aria-label="Storage and sync status" className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Draft on this device</h2>
            <p className="mt-1 text-sm text-slate-700" aria-live="polite">
              {draftState === 'loading' && 'Checking local storage…'}
              {draftState === 'idle' && 'No unsaved changes'}
              {draftState === 'unsaved' && 'Unsaved changes'}
              {draftState === 'saving' && 'Saving draft locally…'}
              {draftState === 'saved' && 'Draft saved locally'}
              {draftState === 'error' && 'Local save failed'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Sync and scanning</h2>
            <p className="mt-1 text-sm text-slate-700">Local only · not uploaded · no page scanning service</p>
          </div>
        </section>

        {storageError && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{storageError}</p>}
        {notice && <p aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">{notice}</p>}

        <section aria-labelledby="record-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {step === 'form' ? (
            <>
              <h2 id="record-heading" className="text-xl font-bold">Audit run details</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Only enter a public, unauthenticated page URL. URLs with sign-in details, query parameters or fragments are rejected. Do not include private or personal information in the remediation hint.</p>
              <form className="mt-6 space-y-5" noValidate onSubmit={startReview}>
                <label className="block text-sm font-medium" htmlFor="field-targetUrl">Public page URL
                  <input id="field-targetUrl" name="targetUrl" type="url" autoComplete="url" maxLength={2048} className={inputClass} value={input.targetUrl} disabled={isBusy} onChange={(event) => updateField('targetUrl', event.target.value)} aria-invalid={Boolean(issueFor('targetUrl'))} aria-describedby={issueFor('targetUrl') ? 'error-targetUrl' : 'help-targetUrl'} />
                  {issueFor('targetUrl') ? <span id="error-targetUrl" className="mt-1 block text-sm text-red-800">{issueFor('targetUrl')}</span> : <span id="help-targetUrl" className="mt-1 block font-normal text-slate-600">HTTPS only. The app stores this address but does not visit it.</span>}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium" htmlFor="field-ruleId">Rule identifier
                    <input id="field-ruleId" name="ruleId" type="text" maxLength={80} autoCapitalize="none" autoCorrect="off" className={inputClass} value={input.ruleId} disabled={isBusy} onChange={(event) => updateField('ruleId', event.target.value)} aria-invalid={Boolean(issueFor('ruleId'))} aria-describedby={issueFor('ruleId') ? 'error-ruleId' : 'help-ruleId'} />
                    {issueFor('ruleId') ? <span id="error-ruleId" className="mt-1 block text-sm text-red-800">{issueFor('ruleId')}</span> : <span id="help-ruleId" className="mt-1 block font-normal text-slate-600">For example: color-contrast or image-alt.</span>}
                  </label>

                  <label className="block text-sm font-medium" htmlFor="field-severity">Severity
                    <select id="field-severity" name="severity" className={inputClass} value={input.severity} disabled={isBusy} onChange={(event) => updateField('severity', event.target.value)} aria-invalid={Boolean(issueFor('severity'))} aria-describedby={issueFor('severity') ? 'error-severity' : 'help-severity'}>
                      {severities.map((severity) => <option value={severity} key={severity}>{severityLabel(severity)}</option>)}
                    </select>
                    {issueFor('severity') ? <span id="error-severity" className="mt-1 block text-sm text-red-800">{issueFor('severity')}</span> : <span id="help-severity" className="mt-1 block font-normal text-slate-600">Severity is user-entered and has not been independently verified.</span>}
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium" htmlFor="field-startedAtLocal">Run start (your local time)
                    <input id="field-startedAtLocal" name="startedAtLocal" type="datetime-local" max={maxLocalTime} className={inputClass} value={input.startedAtLocal} disabled={isBusy} onChange={(event) => updateField('startedAtLocal', event.target.value)} aria-invalid={Boolean(issueFor('startedAtLocal'))} aria-describedby={issueFor('startedAtLocal') ? 'error-startedAtLocal' : 'help-startedAtLocal'} />
                    {issueFor('startedAtLocal') ? <span id="error-startedAtLocal" className="mt-1 block text-sm text-red-800">{issueFor('startedAtLocal')}</span> : <span id="help-startedAtLocal" className="mt-1 block font-normal text-slate-600">Uses the device clock, which may be inaccurate.</span>}
                  </label>
                  <label className="block text-sm font-medium" htmlFor="field-completedAtLocal">Run completion (your local time)
                    <input id="field-completedAtLocal" name="completedAtLocal" type="datetime-local" min={input.startedAtLocal || undefined} max={maxLocalTime} className={inputClass} value={input.completedAtLocal} disabled={isBusy} onChange={(event) => updateField('completedAtLocal', event.target.value)} aria-invalid={Boolean(issueFor('completedAtLocal'))} aria-describedby={issueFor('completedAtLocal') ? 'error-completedAtLocal' : 'help-completedAtLocal'} />
                    {issueFor('completedAtLocal') ? <span id="error-completedAtLocal" className="mt-1 block text-sm text-red-800">{issueFor('completedAtLocal')}</span> : <span id="help-completedAtLocal" className="mt-1 block font-normal text-slate-600">Must be at or after the start time.</span>}
                  </label>
                </div>

                <label className="block text-sm font-medium" htmlFor="field-remediationHint">Remediation hint
                  <textarea id="field-remediationHint" name="remediationHint" rows={4} maxLength={500} className={inputClass} value={input.remediationHint} disabled={isBusy} onChange={(event) => updateField('remediationHint', event.target.value)} aria-invalid={Boolean(issueFor('remediationHint'))} aria-describedby={issueFor('remediationHint') ? 'error-remediationHint' : 'help-remediationHint'} />
                  {issueFor('remediationHint') ? <span id="error-remediationHint" className="mt-1 block text-sm text-red-800">{issueFor('remediationHint')}</span> : <span id="help-remediationHint" className="mt-1 block font-normal text-slate-600">Up to 500 characters. Avoid personal data or confidential site details.</span>}
                </label>

                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                  <button type="submit" className={primaryButtonClass} disabled={isBusy || draftState === 'loading' || draftState === 'error'}>Review record</button>
                  <button type="button" onClick={() => void discardDraft()} className={secondaryButtonClass} disabled={isBusy}>Discard draft</button>
                </div>
              </form>
            </>
          ) : (
            <div>
              <h2 id="record-heading" className="text-xl font-bold">Review this local audit record</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">This is a user-entered record. No automated scan, complete accessibility review or certification has taken place.</p>
              <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-slate-600">Public page</dt><dd className="mt-1 break-all">{input.targetUrl.trim()}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Rule</dt><dd className="mt-1">{input.ruleId.trim()}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Severity</dt><dd className="mt-1">{severityLabel(input.severity)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Run started</dt><dd className="mt-1">{input.startedAtLocal ? formatDateTime(new Date(input.startedAtLocal).toISOString()) : 'Unknown time'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Run completed</dt><dd className="mt-1">{input.completedAtLocal ? formatDateTime(new Date(input.completedAtLocal).toISOString()) : 'Unknown time'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-slate-600">Remediation hint</dt><dd className="mt-1 whitespace-pre-wrap">{input.remediationHint.trim()}</dd></div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep('form')} disabled={isBusy} className={secondaryButtonClass}>Back to edit</button>
                <button type="button" onClick={() => void saveAuditRun()} disabled={isBusy} className={primaryButtonClass}>Confirm and save locally</button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="runs-heading" className="space-y-4">
          <div>
            <h2 id="runs-heading" className="text-xl font-bold">Audit records on this device</h2>
            <p className="mt-1 text-sm text-slate-600">Records stay in this browser until you delete them or clear browser storage. They are not encrypted or backed up by this prototype.</p>
          </div>
          {runs.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No local audit records yet.</p> : runs.map((run) => (
            <article key={run.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{run.ruleId} · {severityLabel(run.severity)}</h3>
                  <p className="mt-1 break-all text-sm text-slate-700">{run.targetUrl}</p>
                  <p className="mt-1 text-sm text-slate-600">Run: {formatDateTime(run.startedAt)} to {formatDateTime(run.completedAt)}</p>
                </div>
                <button type="button" disabled={isBusy} onClick={() => setPendingDelete(run.id)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50">Delete local record</button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{run.remediationHint}</p>
              <p className="mt-2 text-xs text-slate-500">Saved on this device at {formatDateTime(run.createdAt)}. This is not a verified scan or certification.</p>
              {pendingDelete === run.id && (
                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4" role="group" aria-label="Confirm audit record deletion">
                  <p className="text-sm text-red-950">Delete this record permanently from this device? It cannot be restored from this prototype.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void deleteAuditRun(run.id)} disabled={isBusy} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50">Delete permanently</button>
                    <button type="button" onClick={() => setPendingDelete(null)} disabled={isBusy} className={secondaryButtonClass}>Keep record</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
