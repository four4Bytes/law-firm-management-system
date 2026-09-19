"use client";

import clsx from "clsx";
import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from "react-aria-components";

import styles from "./Popover.module.css";

export interface PopoverProps extends Omit<AriaPopoverProps, "className"> {
  className?: string;
  children: React.ReactNode;
  width?: "trigger" | "content";
}

export function Popover({ children, className, width = "trigger", ...props }: PopoverProps) {
  return (
    <AriaPopover
      className={clsx(
        styles.popover,
        width === "content" ? styles.fitContent : styles.matchTrigger,
        className,
      )}
      {...props}
    >
      {children}
    </AriaPopover>
  );
}
