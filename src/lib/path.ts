export function getParentPath(entity: {
  case_id: string | null;
  consultation_id: string | null;
}): string {
  if (entity.case_id) return `/case/${entity.case_id}`;
  if (entity.consultation_id) return `/consultation/${entity.consultation_id}`;
  return "/case";
}
