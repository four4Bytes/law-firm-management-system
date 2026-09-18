/**
 * Shared `SELECT ... FOR UPDATE` row locks for transactional mutations.
 *
 * Centralizes the parent-row locking pattern (previously copied across task,
 * case, and consultation mutations) so documents/notes mutations lock any
 * parent without importing across feature domains.
 *
 * @module lib/row-locks
 */

import type { TransactionClient } from "@/lib/prisma";

/**
 * Locks a task row for the duration of the surrounding transaction.
 *
 * @param tx - The transaction client.
 * @param taskId - The task id to lock.
 */
export async function lockTaskRow(tx: TransactionClient, taskId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Task" WHERE id = ${taskId} FOR UPDATE`;
}

/**
 * Locks a case row for the duration of the surrounding transaction.
 *
 * @param tx - The transaction client.
 * @param caseId - The case id to lock.
 */
export async function lockCaseRow(tx: TransactionClient, caseId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Case" WHERE id = ${caseId} FOR UPDATE`;
}

/**
 * Locks a consultation row for the duration of the surrounding transaction.
 *
 * @param tx - The transaction client.
 * @param consultationId - The consultation id to lock.
 */
export async function lockConsultationRow(
  tx: TransactionClient,
  consultationId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Consultation" WHERE id = ${consultationId} FOR UPDATE`;
}
