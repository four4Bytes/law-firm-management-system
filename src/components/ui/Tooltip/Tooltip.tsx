"use client";

import clsx from "clsx";
import {
  OverlayArrow as AriaOverlayArrow,
  Tooltip as AriaTooltip,
  type TooltipProps as AriaTooltipProps,
} from "react-aria-components";

import styles from "./Tooltip.module.css";

export interface TooltipProps extends Omit<AriaTooltipProps, "className"> {
  className?: string;
  children: React.ReactNode;
}

export function Tooltip({ children, className, offset = 8, ...props }: TooltipProps) {
  return (
    <AriaTooltip offset={offset} className={clsx(styles.tooltip, className)} {...props}>
      <AriaOverlayArrow className={styles.arrow}>
        <svg viewBox="0 0 8 8" aria-hidden="true">
          <path d="M0 0 L4 4 L8 0" />
        </svg>
      </AriaOverlayArrow>
      {children}
    </AriaTooltip>
  );
}
