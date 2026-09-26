/**
 * Shared `SELECT ... FOR UPDATE` row locks for transactional mutations.
 *
 * Only task mutations need a pessimistic row lock: they read the derived
 * status, then write assignment and decision states that re-derive it, so two
 * concurrent writers would otherwise interleave. Case and consultation status
 * changes use a compare-and-set on the status column instead (an
 * `expectedStatus` predicate that raises `StatusConflictError` when it matches
 * no row), which is cheaper and needs no explicit lock.
 *
 * @module lib/row-locks
 */

import type { TransactionClient } from "@/lib/infra/prisma";

/**
 * Locks a task row for the duration of the surrounding transaction.
 *
 * @param tx - The transaction client.
 * @param taskId - The task id to lock.
 */
export async function lockTaskRow(tx: TransactionClient, taskId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Task" WHERE id = ${taskId} FOR UPDATE`;
}
