"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import {
  CheckboxButton,
  CheckboxField,
  type CheckboxFieldProps,
  type ValidationResult,
} from "react-aria-components";
import { FaCheck, FaMinus } from "react-icons/fa6";

import { Description, FieldError } from "@/components/ui/Form/Form";

import styles from "./Checkbox.module.css";

interface CheckboxProps extends CheckboxFieldProps {
  children?: ReactNode;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function Checkbox({
  children,
  description,
  errorMessage,
  className,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxField {...props} className={clsx(styles.field, className)}>
      <CheckboxButton className={styles.button}>
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
      </CheckboxButton>
      {description && <Description>{description}</Description>}
      {errorMessage && (
        <FieldError className={styles.error}>{errorMessage}</FieldError>
      )}
    </CheckboxField>
  );
}
