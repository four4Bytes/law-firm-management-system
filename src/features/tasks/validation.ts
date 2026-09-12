export function hasAssigneeReviewerOverlap(assigneeIds: string[], reviewerIds: string[]): boolean {
  const reviewerSet = new Set(reviewerIds);
  return assigneeIds.some((id) => reviewerSet.has(id));
}

export function isReviewerAssignee(userId: string, assigneeIds: string[]): boolean {
  return assigneeIds.includes(userId);
}

export function hasNoAssignee(assigneeIds: string[]): boolean {
  return assigneeIds.length === 0;
}

export function wouldLeaveNoReviewer(remainingCount: number): boolean {
  return remainingCount === 0;
}
