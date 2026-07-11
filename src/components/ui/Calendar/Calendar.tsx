"use client";

import clsx from "clsx";
import {
  Calendar as AriaCalendar,
  CalendarCell as AriaCalendarCell,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarGrid,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarHeading,
  Text,
  type CalendarProps as AriaCalendarProps,
  type CalendarCellProps,
  type DateValue,
} from "react-aria-components/Calendar";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";

import styles from "./Calendar.module.css";

export interface CalendarProps<T extends DateValue> extends AriaCalendarProps<T> {
  errorMessage?: string;
}

export function Calendar<T extends DateValue>({
  errorMessage,
  className,
  ...props
}: CalendarProps<T>) {
  const months = props.visibleDuration?.months ?? 1;

  return (
    <AriaCalendar {...props} className={clsx(styles.calendar, className)}>
      <div className={styles.months}>
        {Array.from({ length: months }, (_, i) => (
          <div key={i} className={styles.month}>
            <header className={styles.header}>
              {i === 0 && (
                <Button variant="ghost" slot="previous" className={styles.navButton}>
                  <FaChevronLeft />
                </Button>
              )}
              <CalendarHeading className={styles.heading} offset={{ months: i }} />
              {i === months - 1 && (
                <Button variant="ghost" slot="next" className={styles.navButton}>
                  <FaChevronRight />
                </Button>
              )}
            </header>
            <CalendarGrid offset={{ months: i }} className={styles.grid}>
              <CalendarGridHeader />
              <CalendarGridBody>{(date) => <CalendarCell date={date} />}</CalendarGridBody>
            </CalendarGrid>
          </div>
        ))}
      </div>
      {errorMessage && (
        <Text slot="errorMessage" className={styles.error}>
          {errorMessage}
        </Text>
      )}
    </AriaCalendar>
  );
}

export function CalendarCell({ className, ...props }: CalendarCellProps) {
  return <AriaCalendarCell {...props} className={clsx(styles.cell, className)} />;
}

export function CalendarGridHeader() {
  return (
    <AriaCalendarGridHeader>
      {(day) => <CalendarHeaderCell className={styles.headerCell}>{day}</CalendarHeaderCell>}
    </AriaCalendarGridHeader>
  );
}
