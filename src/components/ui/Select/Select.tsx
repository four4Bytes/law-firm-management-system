"use client";

import clsx from "clsx";
import {
  Button as AriaButton,
  FieldError as AriaFieldError,
  Label as AriaLabel,
  Popover as AriaPopover,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  type SelectProps as AriaSelectProps,
  type ListBoxItemProps,
  type ValidationResult,
} from "react-aria-components";
import { FaChevronDown } from "react-icons/fa6";

import { Text } from "@/components/ui/Content/Content";
import { DropdownItem, DropdownListBox } from "@/components/ui/ListBox/ListBox";

import styles from "./Select.module.css";

export interface SelectProps<
  T extends object,
  M extends "single" | "multiple" = "single",
> extends Omit<AriaSelectProps<T, M>, "children"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

export function Select<T extends object, M extends "single" | "multiple" = "single">({
  label,
  description,
  errorMessage,
  children,
  items,
  className,
  ...props
}: SelectProps<T, M>) {
  return (
    <AriaSelect {...props} className={clsx(styles.select, className)}>
      {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
      <AriaButton className={styles.trigger}>
        <AriaSelectValue className={styles.value} />
        <FaChevronDown className={styles.chevron} />
      </AriaButton>
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
      <AriaPopover className={styles.popover}>
        <DropdownListBox items={items}>{children}</DropdownListBox>
      </AriaPopover>
    </AriaSelect>
  );
}

export function SelectItem(props: ListBoxItemProps) {
  return <DropdownItem {...props} />;
}
