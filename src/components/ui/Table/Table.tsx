'use client';

import clsx from 'clsx';
import {
  Cell as AriaCell,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableHeader as AriaTableHeader,
  type TableProps as AriaTableProps,
} from 'react-aria-components';

import styles from './Table.module.css';

// BASIC STYLED COMPONENTS

export function Table(props: AriaTableProps) {
  return <AriaTable {...props} className={clsx(styles.table, props.className)} />;
}

export function TableHeader(props: React.ComponentProps<typeof AriaTableHeader>) {
  return <AriaTableHeader {...props} className={clsx(styles.tableHeader, props.className)} />;
}

export function TableBody<T extends object>(props: React.ComponentProps<typeof AriaTableBody<T>>) {
  return <AriaTableBody {...props} className={clsx(styles.body, props.className)} />;
}

export function Row<T extends object>(props: React.ComponentProps<typeof AriaRow<T>>) {
  return <AriaRow {...props} className={clsx(styles.row, props.className)} />;
}

export function Cell(props: React.ComponentProps<typeof AriaCell>) {
  return <AriaCell {...props} className={clsx(styles.cell, props.className)} />;
}

export function Column(props: React.ComponentProps<typeof AriaColumn>) {
  return <AriaColumn {...props} className={clsx(styles.column, props.className)} />;
}
