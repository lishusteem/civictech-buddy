'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { computeCodeAlerts, mergeAlerts } from '@/lib/alerts/codeAlerts';
import { computeStale } from '@/lib/project/stale';
import type { Project } from '@/lib/project/schema';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'conflict' | 'invalid';
export type Conflict = { draft: Project; draftUpdatedAt: string };

const DEBOUNCE_MS = 800;
const RETRY_MS = 3000;
const MAX_RETRIES = 3;

/** Applies the derived fields (stale ids, code alerts) that must accompany every change. */
function withDerived(prev: Project, next: Project): Project {
  const stale = [...new Set([...next.stale, ...computeStale(prev, next)])];
  const alerts = mergeAlerts(next.alerts, computeCodeAlerts(next));
  return { ...next, stale, alerts };
}

export function useAutosave(token: string, initial: { draft: Project; draftUpdatedAt: string }) {
  const [draft, setDraftState] = useState<Project>(initial.draft);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(initial.draftUpdatedAt);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [conflict, setConflict] = useState<Conflict | null>(null);

  const draftRef = useRef(initial.draft);
  const expectedRef = useRef(initial.draftUpdatedAt);
  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const conflictRef = useRef<Conflict | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const terminalRef = useRef(false);
  const [fatal, setFatal] = useState(false);
  const flushRef = useRef<(force?: boolean, keepalive?: boolean) => Promise<void>>(async () => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const schedule = useCallback(
    (ms: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => void flushRef.current(), ms);
    },
    [clearTimer],
  );

  flushRef.current = async (force = false, keepalive = false) => {
    if (!mountedRef.current) return;
    if (terminalRef.current) return;
    if (conflictRef.current && !force) return;
    if (inFlightRef.current) return; // the running save re-schedules itself when dirty
    if (!dirtyRef.current && !force) return;

    inFlightRef.current = true;
    dirtyRef.current = false;
    const sent = draftRef.current;
    let outcome: 'ok' | 'conflict' | 'error' | 'invalid' | 'fatal' = 'error';
    let payload: { draftUpdatedAt?: string; conflict?: Conflict } = {};
    try {
      const res = await fetch(`/api/e/${token}`, {
        method: 'PUT',
        ...(keepalive ? { keepalive: true } : {}),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: sent,
          expectedUpdatedAt: expectedRef.current,
          ...(force ? { force: true } : {}),
        }),
      });
      if (res.status === 409) {
        outcome = 'conflict';
        payload = await res.json().catch(() => ({}));
      } else if (res.status === 404) {
        outcome = 'invalid';
      } else if (res.status >= 400 && res.status < 500) {
        outcome = 'fatal';
      } else if (res.ok) {
        outcome = 'ok';
        payload = await res.json().catch(() => ({}));
      }
    } catch {
      outcome = 'error';
    }
    inFlightRef.current = false;
    if (!mountedRef.current) return;

    if (outcome === 'ok' && payload.draftUpdatedAt) {
      expectedRef.current = payload.draftUpdatedAt;
      setDraftUpdatedAt(payload.draftUpdatedAt);
      retriesRef.current = 0;
      if (dirtyRef.current) {
        setStatus('saving');
        schedule(DEBOUNCE_MS);
      } else {
        setStatus('saved');
      }
    } else if (outcome === 'conflict' && payload.conflict) {
      dirtyRef.current = true;
      conflictRef.current = payload.conflict;
      setConflict(payload.conflict);
      setStatus('conflict');
    } else if (outcome === 'invalid') {
      dirtyRef.current = true;
      terminalRef.current = true;
      setStatus('invalid');
    } else if (outcome === 'fatal') {
      dirtyRef.current = true;
      terminalRef.current = true;
      setFatal(true);
      setStatus('error');
    } else {
      dirtyRef.current = true;
      setStatus('error');
      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        schedule(RETRY_MS);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !inFlightRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden' || !dirtyRef.current) return;
      clearTimer();
      void flushRef.current(false, true);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clearTimer]);

  const setDraft = useCallback((next: Project) => {
    const derived = withDerived(draftRef.current, next);
    draftRef.current = derived;
    setDraftState(derived);
    dirtyRef.current = true;
    retriesRef.current = 0;
    if (conflictRef.current || terminalRef.current) return; // keep the conflict dialog; the choice decides what is sent
    setStatus('saving');
    schedule(DEBOUNCE_MS);
  }, [schedule]);

  const resolveConflict = useCallback((choice: 'mine' | 'theirs') => {
    const stored = conflictRef.current;
    if (!stored) return;
    clearTimer();
    conflictRef.current = null;
    setConflict(null);
    expectedRef.current = stored.draftUpdatedAt;
    if (choice === 'theirs') {
      draftRef.current = stored.draft;
      setDraftState(stored.draft);
      setDraftUpdatedAt(stored.draftUpdatedAt);
      dirtyRef.current = false;
      retriesRef.current = 0;
      setStatus('saved');
      return;
    }
    setStatus('saving');
    void flushRef.current(true);
  }, [clearTimer]);

  return { draft, draftUpdatedAt, setDraft, status, fatal, conflict, resolveConflict };
}
