"use client";

import { Text } from "@/components/ui/Content/Content";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { StatusDot } from "@/components/ui/StatusDot/StatusDot";
import { keysToSet } from "@/lib/form-utils";

import styles from "./UserSelect.module.css";

export interface UserOption {
  id: string;
  name: string;
  is_online: boolean;
}

export interface UserSelectProps {
  users: UserOption[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  isDisabled?: boolean;
  label?: string;
  placeholder?: string;
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
  disabledKeys,
  validate,
}: UserSelectProps) {
  return (
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
      {(user) => (
        <SelectItem id={user.id} textValue={user.name}>
          <span className={styles.option}>
            <StatusDot isOnline={user.is_online} />
            <Text slot="label">{user.name}</Text>
          </span>
        </SelectItem>
      )}
    </Select>
  );
}
