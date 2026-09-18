"use client";

import clsx from "clsx";
import {
  FieldError as AriaFieldError,
  Label as AriaLabel,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  type SelectProps as AriaSelectProps,
  type ListBoxItemProps,
  type ValidationResult,
} from "react-aria-components";
import { FaChevronDown } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Text } from "@/components/ui/Content/Content";
import { DropdownItem, DropdownListBox } from "@/components/ui/ListBox/ListBox";
import { Popover } from "@/components/ui/Popover/Popover";

import styles from "./Select.module.css";

export interface SelectProps<
  T extends object,
  M extends "single" | "multiple" = "single",
> extends Omit<AriaSelectProps<T, M>, "children"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  alwaysPlaceholder?: boolean;
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

export function Select<T extends object, M extends "single" | "multiple" = "single">({
  label,
  description,
  errorMessage,
  alwaysPlaceholder,
  children,
  items,
  className,
  ...props
}: SelectProps<T, M>) {
  return (
    <AriaSelect {...props} className={clsx(styles.select, className)}>
      {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
      <Button variant="ghost" className={styles.trigger}>
        <AriaSelectValue className={styles.value}>
          {({ isPlaceholder, defaultChildren }) =>
            alwaysPlaceholder && !isPlaceholder ? (
              <span className={styles.valuePlaceholder}>{props.placeholder}</span>
            ) : (
              defaultChildren
            )
          }
        </AriaSelectValue>
        <FaChevronDown className={styles.chevron} />
      </Button>
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
      <Popover>
        <DropdownListBox items={items}>{children}</DropdownListBox>
      </Popover>
    </AriaSelect>
  );
}

export function SelectItem(props: ListBoxItemProps) {
  return <DropdownItem {...props} />;
}
