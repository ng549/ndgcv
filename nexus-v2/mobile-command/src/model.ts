export type Job = { id: string; projectId: string; title: string; resource: string;
  status: string; instruction: string; branch: string | null; costMicros: number | null };
export type Approval = { id: string; projectId: string; packetId: string; executionId: string;
  title: string; detail: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  kind: 'PROVIDER_PERMISSION' | 'AGENCY_REVIEW'; version: number; actionDigest: string;
  expiresAt: string; risk: 'ROUTINE' | 'ELEVATED'; policyAllowed: boolean };
export const projects = [{ id: 'nexus', name: 'Nexus' }];
// These records never come from or go to Factory. Keep preview opt-in and conspicuous.
export function previewRecords(): { jobs: Job[]; approvals: Approval[] } {
  return { jobs: [{ id: 'preview-packet', projectId: 'nexus', title: 'Review the mobile command slice',
    resource: 'Devil Up AI', status: 'NEEDS_REVIEW', instruction: 'Example work only',
    branch: 'feature/nexus-mobile-command', costMicros: null }], approvals: [{
      id: 'preview-approval', projectId: 'nexus', packetId: 'preview-packet', executionId: 'preview-execution',
      title: 'Run local checks', detail: 'Run npm test within the assigned module. No deployment or merge.',
      status: 'PENDING', kind: 'PROVIDER_PERMISSION', version: 1, actionDigest: 'preview-only',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), risk: 'ROUTINE', policyAllowed: true
    }] };
}
