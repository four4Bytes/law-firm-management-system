"use client";

import clsx from "clsx";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";

import styles from "./Button.module.css";

interface ButtonProps extends AriaButtonProps {
  variant?: "primary" | "secondary" | "navigation" | "ghost";
  children: React.ReactNode;
}

export function Button({ variant = "primary", children, className, ...props }: ButtonProps) {
  return (
    <AriaButton {...props} className={clsx(styles.button, styles[variant], className)}>
      {children}
    </AriaButton>
  );
}
