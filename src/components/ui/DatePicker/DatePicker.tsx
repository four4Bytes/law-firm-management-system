"use client";

import type { DateDuration } from "@internationalized/date";
import clsx from "clsx";
import {
  DatePicker as AriaDatePicker,
  FieldError as AriaFieldError,
  Label as AriaLabel,
  Group,
  Text,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
  type ValidationResult,
} from "react-aria-components";
import { FaCalendarDays } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Calendar } from "@/components/ui/Calendar/Calendar";
import { DateInput } from "@/components/ui/DateField/DateField";
import { Popover } from "@/components/ui/Popover/Popover";

import styles from "./DatePicker.module.css";

export interface DatePickerProps<T extends DateValue> extends AriaDatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  visibleDuration?: DateDuration;
}

export function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  visibleDuration,
  ...props
}: DatePickerProps<T>) {
  return (
    <AriaDatePicker {...props} className={clsx(styles.picker, className)}>
      {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
      <Group className={styles.group}>
        <DateInput className={styles.dateInput} />
        <Button variant="ghost" className={styles.trigger} aria-label="Open calendar">
          <FaCalendarDays aria-hidden="true" />
        </Button>
      </Group>
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
      <Popover className={styles.popover} placement="bottom">
        <Calendar visibleDuration={visibleDuration} />
      </Popover>
    </AriaDatePicker>
  );
}
