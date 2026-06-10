"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components";
import { FaCheck, FaMinus } from "react-icons/fa6";

import { Text } from "@/components/ui/Content/Content";

import styles from "./Checkbox.module.css";

interface CheckboxProps extends AriaCheckboxProps {
  children?: ReactNode;
  description?: string;
  errorMessage?: string;
}

export function Checkbox({
  children,
  description,
  errorMessage,
  className,
  ...props
}: CheckboxProps) {
  return (
    <div className={clsx(styles.field, className)}>
      <AriaCheckbox className={styles.button} {...props}>
        {({ isSelected, isIndeterminate }) => (
          <>
            <div className={styles.indicator}>
              {isIndeterminate ? (
                <FaMinus className={styles.icon} />
              ) : isSelected ? (
                <FaCheck className={styles.icon} />
              ) : null}
            </div>
            {children}
          </>
        )}
      </AriaCheckbox>
      {description && <Text slot="description">{description}</Text>}
      {errorMessage && (
        <span className={styles.error} role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
