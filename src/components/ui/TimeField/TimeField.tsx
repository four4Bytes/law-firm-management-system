"use client";

import clsx from "clsx";
import {
  FieldError as AriaFieldError,
  Label as AriaLabel,
  TimeField as AriaTimeField,
  Text,
  type TimeFieldProps as AriaTimeFieldProps,
  type TimeValue,
  type ValidationResult,
} from "react-aria-components";

import { DateInput } from "@/components/ui/DateField/DateField";

import styles from "./TimeField.module.css";

export interface TimeFieldProps<T extends TimeValue> extends AriaTimeFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function TimeField<T extends TimeValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: TimeFieldProps<T>) {
  return (
    <AriaTimeField {...props} className={clsx(styles.field, className)}>
      {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
      <DateInput />
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
    </AriaTimeField>
  );
}
