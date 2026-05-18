"use client";

import {
  TextField as AriaTextField,
  Label,
  Input as AriaInput,
  Text,
  FieldError,
  type TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";
import styles from "./Input.module.css";
import clsx from "clsx";

interface InputProps extends AriaTextFieldProps {
  label?: string;
  description?: string;
  placeholder?: string;
}

export function Input({
  label,
  description,
  placeholder,
  className,
  ...props
}: InputProps) {
  return (
    <AriaTextField {...props} className={clsx(styles.field, className)}>
      {label && <Label className={styles.label}>{label}</Label>}
      <AriaInput placeholder={placeholder} className={styles.input} />
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <FieldError className={styles.error} />
    </AriaTextField>
  );
}
