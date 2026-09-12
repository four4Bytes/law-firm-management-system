export const TASK_PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"] as const;

export const TASK_PRIORITY_NONE_VALUE = "__none";

/**
 * Returns the selectable priority options, preserving a legacy stored value
 * that predates the fixed option set so existing tasks keep displaying it.
 */
export function taskPriorityOptions(current: string): string[] {
  if (!current || (TASK_PRIORITY_OPTIONS as readonly string[]).includes(current)) {
    return [...TASK_PRIORITY_OPTIONS];
  }
  return [current, ...TASK_PRIORITY_OPTIONS];
}
