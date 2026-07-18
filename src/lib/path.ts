/** Resolves a navigation target for an entity that belongs to either a case or a consultation. */

/**
 * Returns the parent route for an entity linked to a case or consultation.
 *
 * @param entity - Object carrying at most one of `case_id` / `consultation_id`.
 * @returns The detail route for the linked parent, or `/case` when unlinked.
 */
export function getParentPath(entity: {
  case_id: string | null;
  consultation_id: string | null;
}): string {
  if (entity.case_id) return `/case/${entity.case_id}`;
  if (entity.consultation_id) return `/consultation/${entity.consultation_id}`;
  return "/case";
}
