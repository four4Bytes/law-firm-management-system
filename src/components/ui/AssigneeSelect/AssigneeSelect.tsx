"use client";

import { Select, SelectItem } from "@/components/ui/Select/Select";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { keysToSet } from "@/lib/form-utils";

import styles from "./AssigneeSelect.module.css";

export interface AssigneeSelectProps {
  users: ActiveUserSummary[];
  assigneeIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  isDisabled?: boolean;
}

export function AssigneeSelect({ users, assigneeIds, onChange, isDisabled }: AssigneeSelectProps) {
  return (
    <>
      <Select
        label="Assignees"
        selectionMode="multiple"
        value={Array.from(assigneeIds)}
        onChange={(keys) => onChange(keysToSet(keys))}
        placeholder="Select assignees..."
        items={users}
        isDisabled={isDisabled}
      >
        {(user) => <SelectItem id={user.id}>{user.name}</SelectItem>}
      </Select>
      {assigneeIds.size > 0 && (
        <ul className={styles.selectedAssignees}>
          {users
            .filter((u) => assigneeIds.has(u.id))
            .map((u) => (
              <li key={u.id} className={styles.selectedAssignee}>
                {u.name}
              </li>
            ))}
        </ul>
      )}
    </>
  );
}
