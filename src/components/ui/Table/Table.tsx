"use client";

import clsx from "clsx";
import React from "react";
import {
  Button as AriaButton,
  Cell as AriaCell,
  Column as AriaColumn,
  ResizableTableContainer as AriaResizableTableContainer,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableHeader as AriaTableHeader,
  TableLoadMoreItem as AriaTableLoadMoreItem,
  Collection,
  ColumnResizer,
  composeRenderProps,
  useTableOptions,
  type ColumnProps as AriaColumnProps,
  type RowProps as AriaRowProps,
  type TableBodyProps as AriaTableBodyProps,
  type TableHeaderProps as AriaTableHeaderProps,
  type TableProps as AriaTableProps,
  type TableLoadMoreItemProps,
} from "react-aria-components";
import { FaChevronDown, FaChevronRight, FaChevronUp, FaGripVertical } from "react-icons/fa6";

import { Checkbox } from "@/components/ui/Checkbox/Checkbox";

import styles from "./Table.module.css";

export const ResizableTableContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof AriaResizableTableContainer>
>(function ResizableTableContainer({ className, ...props }, ref) {
  return (
    <AriaResizableTableContainer
      ref={ref}
      className={clsx(styles.resizableTableContainer, className)}
      {...props}
    />
  );
});

export function Table({ className, ...props }: AriaTableProps) {
  return <AriaTable className={clsx(styles.table, className)} {...props} />;
}

interface ColumnProps extends AriaColumnProps {
  allowsResizing?: boolean;
}

export function Column({ allowsResizing, className, children, ...props }: ColumnProps) {
  return (
    <AriaColumn className={clsx(styles.column, className)} {...props}>
      {({ allowsSorting, sortDirection }) => (
        <div className={styles.columnHeader}>
          <div role="presentation" tabIndex={-1} className={styles.columnName}>
            {children as React.ReactNode}
          </div>
          {allowsSorting && (
            <span aria-hidden="true" className={styles.sortIndicator}>
              {sortDirection === "ascending" ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          )}
          {allowsResizing && <ColumnResizer aria-label="Resize" className={styles.columnResizer} />}
        </div>
      )}
    </AriaColumn>
  );
}

export function TableHeader<T extends object>({
  columns,
  children,
  className,
  ...props
}: AriaTableHeaderProps<T>) {
  const { selectionBehavior, selectionMode, allowsDragging } = useTableOptions();

  return (
    <AriaTableHeader className={clsx(styles.tableHeader, className)} {...props}>
      {allowsDragging && <AriaColumn className={clsx(styles.column, styles.dragColumn)} />}
      {selectionBehavior === "toggle" && (
        <AriaColumn className={clsx(styles.column, styles.selectionColumn)}>
          {selectionMode === "multiple" && <Checkbox slot="selection" />}
        </AriaColumn>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaTableHeader>
  );
}

export function Row<T extends object>({
  id,
  columns,
  children,
  className,
  ...props
}: AriaRowProps<T>) {
  const { selectionBehavior, allowsDragging } = useTableOptions();

  return (
    <AriaRow id={id} className={clsx(styles.row, className)} {...props}>
      {allowsDragging && (
        <Cell className={styles.dragCell}>
          <AriaButton slot="drag" className={styles.dragButton}>
            <FaGripVertical />
          </AriaButton>
        </Cell>
      )}
      {selectionBehavior === "toggle" && (
        <Cell className={styles.selectionCell}>
          <Checkbox slot="selection" />
        </Cell>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
  );
}

export function TableBody<T extends object>({
  className,
  renderEmptyState,
  ...props
}: AriaTableBodyProps<T> & { renderEmptyState?: () => React.ReactNode }) {
  return (
    <AriaTableBody
      className={clsx(styles.tableBody, className)}
      renderEmptyState={renderEmptyState}
      {...props}
    />
  );
}

export function Cell({ className, ...props }: React.ComponentProps<typeof AriaCell>) {
  return (
    <AriaCell className={clsx(styles.cell, className)} {...props}>
      {composeRenderProps(props.children, (children, { hasChildItems, isTreeColumn }) => (
        <>
          {isTreeColumn && hasChildItems && (
            <AriaButton slot="chevron" className={styles.chevronButton}>
              <FaChevronRight />
            </AriaButton>
          )}
          {children}
        </>
      ))}
    </AriaCell>
  );
}

export function TableLoadMoreItem({ className, ...props }: TableLoadMoreItemProps) {
  return <AriaTableLoadMoreItem className={clsx(styles.loadMoreItem, className)} {...props} />;
}
