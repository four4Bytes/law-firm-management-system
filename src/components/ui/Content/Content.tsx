"use client";

import clsx from "clsx";
import { Header as AriaHeader, Text as AriaText } from "react-aria-components";

import styles from "./Content.module.css";

type TextProps = React.ComponentProps<typeof AriaText>;

export function Text({ className, ...props }: TextProps) {
  return <AriaText {...props} className={clsx(styles.text, className)} />;
}

type HeaderProps = React.ComponentProps<typeof AriaHeader>;

export function Header({ className, ...props }: HeaderProps) {
  return <AriaHeader {...props} className={clsx(styles.header, className)} />;
}
