"use client";

import clsx from "clsx";
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment as AriaDateSegment,
  FieldError as AriaFieldError,
  Label as AriaLabel,
  Text,
  type DateFieldProps as AriaDateFieldProps,
  type DateValue,
  type ValidationResult,
} from "react-aria-components";

import styles from "./DateField.module.css";

export interface DateFieldProps<T extends DateValue> extends AriaDateFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DateField<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DateFieldProps<T>) {
  return (
    <AriaDateField {...props} className={clsx(styles.field, className)}>
      {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
      <DateInput />
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
    </AriaDateField>
  );
}

interface DateInputProps {
  className?: string;
}

export function DateInput({ className }: DateInputProps) {
  return (
    <AriaDateInput className={clsx(styles.dateInput, className)}>
      {(segment) => <DateSegment segment={segment} />}
    </AriaDateInput>
  );
}

interface DateSegmentProps {
  segment: Parameters<typeof AriaDateSegment>[0]["segment"];
}

export function DateSegment({ segment }: DateSegmentProps) {
  return <AriaDateSegment segment={segment} className={styles.segment} />;
}
