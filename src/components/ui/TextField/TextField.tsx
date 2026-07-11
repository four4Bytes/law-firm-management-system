"use client";

import clsx from "clsx";
import React from "react";
import {
  FieldError as AriaFieldError,
  Input as AriaInput,
  Label as AriaLabel,
  TextField as AriaTextField,
  TextArea,
  type TextFieldProps as AriaTextFieldProps,
  type ValidationResult,
} from "react-aria-components";

import { Text } from "@/components/ui/Content/Content";

import styles from "./TextField.module.css";

export interface TextFieldProps extends AriaTextFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  type?: "text" | "email" | "password" | "url" | "tel" | "search";
  isTextArea?: boolean;
  rows?: number;
}

export const TextField = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(
  (
    {
      label,
      description,
      errorMessage,
      placeholder,
      type = "text",
      isTextArea,
      rows,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <AriaTextField {...props} className={clsx(styles.field, className)}>
        {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
        {isTextArea ? (
          <TextArea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            placeholder={placeholder}
            rows={rows}
            className={clsx(styles.input, styles.textarea)}
          />
        ) : (
          <AriaInput
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            placeholder={placeholder}
            className={styles.input}
          />
        )}
        {description && (
          <Text slot="description" className={styles.description}>
            {description}
          </Text>
        )}
        <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
      </AriaTextField>
    );
  },
);

TextField.displayName = "TextField";
