"use client";

import {
  Table as AriaTable,
  TableHeader as AriaTableHeader,
  TableBody as AriaTableBody,
  Row as AriaRow,
  Cell as AriaCell,
  Column as AriaColumn,
  type TableProps as AriaTableProps,
} from "react-aria-components";

import clsx from "clsx";
import styles from "./Table.module.css";

// BASIC STYLED COMPONENTS

export function Table(props: AriaTableProps) {
  return (
    <AriaTable {...props} className={clsx(styles.table, props.className)} />
  );
}

export function TableHeader(
  props: React.ComponentProps<typeof AriaTableHeader>,
) {
  return (
    <AriaTableHeader
      {...props}
      className={clsx(styles.header, props.className)}
    />
  );
}

export function TableBody<T extends object>(
  props: React.ComponentProps<typeof AriaTableBody<T>>,
) {
  return (
    <AriaTableBody {...props} className={clsx(styles.body, props.className)} />
  );
}

export function Row<T extends object>(
  props: React.ComponentProps<typeof AriaRow<T>>,
) {
  return <AriaRow {...props} className={clsx(styles.row, props.className)} />;
}

export function Cell(props: React.ComponentProps<typeof AriaCell>) {
  return <AriaCell {...props} className={clsx(styles.cell, props.className)} />;
}

export function Column(props: React.ComponentProps<typeof AriaColumn>) {
  return (
    <AriaColumn {...props} className={clsx(styles.column, props.className)} />
  );
}
