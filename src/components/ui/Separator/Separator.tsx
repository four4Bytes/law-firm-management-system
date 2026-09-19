"use client";

import clsx from "clsx";
import {
  Separator as AriaSeparator,
  type SeparatorProps as AriaSeparatorProps,
} from "react-aria-components";

import styles from "./Separator.module.css";

export type SeparatorProps = AriaSeparatorProps;

export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
  return (
    <AriaSeparator
      {...props}
      orientation={orientation}
      className={clsx(styles.separator, styles[orientation], className)}
    />
  );
}
