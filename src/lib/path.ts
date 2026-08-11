/** Resolves a navigation target for an entity that belongs to a case, consultation, or task. */

/**
 * Returns the parent route for an entity linked to a case, consultation, or task.
 * Tasks belong to cases, so a task_id resolves to its parent case route.
 *
 * @param entity - Object carrying at most one of `case_id` / `consultation_id` / `task_id`.
 * @returns The detail route for the linked parent, or `/case` when unlinked.
 */
export function getParentPath(entity: {
  case_id: string | null;
  consultation_id: string | null;
  task_id?: string | null;
}): string {
  if (entity.case_id) return `/case/${entity.case_id}`;
  if (entity.consultation_id) return `/consultation/${entity.consultation_id}`;
  return "/case";
}
