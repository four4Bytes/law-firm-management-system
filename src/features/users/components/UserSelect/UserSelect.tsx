"use client";

import { Select, SelectItem } from "@/components/ui/Select/Select";
import { UserChips } from "@/features/users/components/UserChips/UserChips";
import { keysToSet } from "@/lib/form-utils";

export interface UserOption {
  id: string;
  name: string;
}

export interface UserSelectProps {
  users: UserOption[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  isDisabled?: boolean;
  label?: string;
  placeholder?: string;
  hideSelected?: boolean;
  disabledKeys?: Set<string>;
  validate?: (value: string[]) => string | null;
}

export function UserSelect({
  users,
  selectedIds,
  onChange,
  isDisabled,
  label = "Assignees",
  placeholder = "Select assignees...",
  hideSelected = false,
  disabledKeys,
  validate,
}: UserSelectProps) {
  const selected = users.filter((user) => selectedIds.has(user.id));

  return (
    <>
      <Select
        label={label}
        selectionMode="multiple"
        value={Array.from(selectedIds)}
        onChange={(keys) => onChange(keysToSet(keys))}
        placeholder={placeholder}
        items={users}
        isDisabled={isDisabled}
        disabledKeys={disabledKeys}
        validate={
          validate
            ? (v: unknown) => {
                const arr = Array.isArray(v)
                  ? (v as string[])
                  : Array.from((v as Iterable<string>) ?? []);
                return validate(arr);
              }
            : undefined
        }
        alwaysPlaceholder
      >
        {(user) => <SelectItem id={user.id}>{user.name}</SelectItem>}
      </Select>
      {!hideSelected && selected.length > 0 && <UserChips users={selected} />}
    </>
  );
}
