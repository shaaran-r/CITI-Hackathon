import type { SQLiteDatabase } from 'expo-sqlite';
import { submitMissionEvidence } from './api';
import { getPendingSubmissions, setSubmissionSyncState } from './local-store';

export async function syncPendingMissionEvidence(
  database: SQLiteDatabase,
): Promise<{ synced: number; pending: number }> {
  const pendingSubmissions = await getPendingSubmissions(database);
  let synced = 0;

  for (const submission of pendingSubmissions) {
    try {
      await submitMissionEvidence({
        assignmentId: submission.assignmentId,
        clientSubmissionId: submission.clientSubmissionId,
        evidenceType: submission.evidenceType,
        evidenceNote: submission.evidenceNote,
      });
      await setSubmissionSyncState(database, submission.clientSubmissionId, 'SYNCED');
      synced += 1;
    } catch {
      await setSubmissionSyncState(
        database,
        submission.clientSubmissionId,
        'FAILED',
        'Could not reach the server. Try again when connected.',
      );
    }
  }

  return { synced, pending: pendingSubmissions.length - synced };
}
