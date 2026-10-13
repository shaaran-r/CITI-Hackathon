import type { SQLiteDatabase } from 'expo-sqlite';
import type { MissionAssignmentCard } from './api';

export async function initializeLocalStore(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS local_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cached_missions (
      assignment_id TEXT PRIMARY KEY NOT NULL,
      mission_json TEXT NOT NULL,
      cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS pending_submissions (
      client_submission_id TEXT PRIMARY KEY NOT NULL,
      assignment_id TEXT NOT NULL,
      evidence_type TEXT NOT NULL CHECK (evidence_type IN ('NOTE', 'CHECKLIST')),
      evidence_note TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'SYNCED', 'FAILED')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function readLocalJson<T>(database: SQLiteDatabase, key: string): Promise<T | null> {
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_store WHERE key = ?',
    key,
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function writeLocalJson(
  database: SQLiteDatabase,
  key: string,
  value: unknown,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO local_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    key,
    JSON.stringify(value),
  );
}

export interface PendingSubmission {
  clientSubmissionId: string;
  assignmentId: string;
  evidenceType: 'NOTE' | 'CHECKLIST';
  evidenceNote: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export async function cacheMissions(
  database: SQLiteDatabase,
  missions: MissionAssignmentCard[],
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM cached_missions');
    for (const mission of missions) {
      await database.runAsync(
        `INSERT INTO cached_missions (assignment_id, mission_json, cached_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(assignment_id) DO UPDATE SET
           mission_json = excluded.mission_json,
           cached_at = CURRENT_TIMESTAMP`,
        mission.id,
        JSON.stringify(mission),
      );
    }
  });
}

export async function readCachedMissions(
  database: SQLiteDatabase,
): Promise<MissionAssignmentCard[]> {
  const rows = await database.getAllAsync<{ mission_json: string }>(
    'SELECT mission_json FROM cached_missions ORDER BY cached_at DESC',
  );
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.mission_json) as MissionAssignmentCard];
    } catch {
      return [];
    }
  });
}

export async function queueMissionEvidence(
  database: SQLiteDatabase,
  submission: Pick<
    PendingSubmission,
    'clientSubmissionId' | 'assignmentId' | 'evidenceType' | 'evidenceNote'
  >,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO pending_submissions
       (client_submission_id, assignment_id, evidence_type, evidence_note, status)
     VALUES (?, ?, ?, ?, 'PENDING')
     ON CONFLICT(client_submission_id) DO NOTHING`,
    submission.clientSubmissionId,
    submission.assignmentId,
    submission.evidenceType,
    submission.evidenceNote,
  );
}

export async function getPendingSubmissions(
  database: SQLiteDatabase,
): Promise<PendingSubmission[]> {
  return database.getAllAsync<PendingSubmission>(
    `SELECT client_submission_id AS clientSubmissionId,
            assignment_id AS assignmentId,
            evidence_type AS evidenceType,
            evidence_note AS evidenceNote,
            status,
            attempts,
            last_error AS lastError,
            created_at AS createdAt
     FROM pending_submissions
     WHERE status IN ('PENDING', 'FAILED')
     ORDER BY created_at ASC`,
  );
}

export async function setSubmissionSyncState(
  database: SQLiteDatabase,
  clientSubmissionId: string,
  status: 'SYNCED' | 'FAILED',
  error: string | null = null,
): Promise<void> {
  await database.runAsync(
    `UPDATE pending_submissions
     SET status = ?, attempts = attempts + 1, last_error = ?
     WHERE client_submission_id = ?`,
    status,
    error,
    clientSubmissionId,
  );
}
