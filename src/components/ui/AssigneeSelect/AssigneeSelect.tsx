"use client";

import { AssigneeChips } from "@/components/ui/AssigneeChips/AssigneeChips";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { keysToSet } from "@/lib/form-utils";

export interface AssigneeOption {
  id: string;
  name: string;
}

export interface AssigneeSelectProps {
  users: AssigneeOption[];
  assigneeIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  isDisabled?: boolean;
}

export function AssigneeSelect({ users, assigneeIds, onChange, isDisabled }: AssigneeSelectProps) {
  const selected = users.filter((user) => assigneeIds.has(user.id));

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
        alwaysPlaceholder
      >
        {(user) => <SelectItem id={user.id}>{user.name}</SelectItem>}
      </Select>
      {selected.length > 0 && <AssigneeChips assignees={selected} />}
    </>
  );
}
