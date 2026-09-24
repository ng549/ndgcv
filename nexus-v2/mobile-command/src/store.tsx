import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { previewRecords, type Job, type Approval } from './model';
type Store = { preview: boolean; jobs: Job[]; approvals: Approval[]; togglePreview: () => void;
  draft: (instruction: string) => void; decide: (id: string, version: number, decision: 'APPROVED' | 'REJECTED') => void };
const Context = createContext<Store | null>(null);
export function CommandStore({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  function togglePreview() {
    const next = !preview; const records = next ? previewRecords() : { jobs: [], approvals: [] };
    setPreview(next); setJobs(records.jobs); setApprovals(records.approvals);
  }
  function draft(instruction: string) {
    if (!preview || !instruction.trim()) return;
    setJobs(all => [{ id: `draft-${Date.now()}`, projectId: 'nexus', title: instruction.trim().slice(0,80),
      instruction: instruction.trim(), resource: 'Devil Up AI', status: 'DRAFT', branch: null, costMicros: null }, ...all]);
  }
  function decide(id: string, version: number, decision: 'APPROVED' | 'REJECTED') {
    if (!preview) return;
    setApprovals(all => all.map(a => a.id === id && a.version === version && a.status === 'PENDING' &&
      Date.parse(a.expiresAt) > Date.now() && (decision === 'REJECTED' || a.risk === 'ROUTINE')
      ? { ...a, status: decision, version: a.version + 1 } : a));
  }
  return <Context.Provider value={{ preview, jobs, approvals, togglePreview, draft, decide }}>{children}</Context.Provider>;
}
export function useCommand() { const store = useContext(Context); if (!store) throw Error('CommandStore missing'); return store; }
