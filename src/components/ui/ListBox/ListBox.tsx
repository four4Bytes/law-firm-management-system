"use client";

import clsx from "clsx";
import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  composeRenderProps,
  type ListBoxItemProps as AriaListBoxItemProps,
  type ListBoxProps as AriaListBoxProps,
} from "react-aria-components";
import { FaCheck } from "react-icons/fa6";

import { Text } from "@/components/ui/Content/Content";

import styles from "./ListBox.module.css";

export function ListBox<T extends object>({ children, className, ...props }: AriaListBoxProps<T>) {
  return (
    <AriaListBox {...props} className={clsx(styles.listbox, className)}>
      {children}
    </AriaListBox>
  );
}

export function ListBoxItem({ className, ...props }: AriaListBoxItemProps) {
  const textValue =
    props.textValue || (typeof props.children === "string" ? props.children : undefined);
  return (
    <AriaListBoxItem
      {...props}
      textValue={textValue}
      className={clsx(styles.listboxItem, className)}
    >
      {composeRenderProps(props.children, (children) =>
        typeof children === "string" ? <Text slot="label">{children}</Text> : children,
      )}
    </AriaListBoxItem>
  );
}

export function DropdownListBox<T extends object>({
  children,
  className,
  ...props
}: AriaListBoxProps<T>) {
  return (
    <AriaListBox {...props} className={clsx(styles.dropdownListbox, className)}>
      {children}
    </AriaListBox>
  );
}

export function DropdownItem({ className, ...props }: AriaListBoxItemProps) {
  const textValue =
    props.textValue || (typeof props.children === "string" ? props.children : undefined);
  return (
    <AriaListBoxItem
      {...props}
      textValue={textValue}
      className={clsx(styles.dropdownItem, className)}
    >
      {composeRenderProps(props.children, (children, { isSelected }) => (
        <>
          {isSelected && <FaCheck className={styles.checkIcon} />}
          {typeof children === "string" ? <Text slot="label">{children}</Text> : children}
        </>
      ))}
    </AriaListBoxItem>
  );
}
