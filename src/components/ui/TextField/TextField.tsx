'use client';

import clsx from 'clsx';
import React from 'react';
import {
  FieldError as AriaFieldError,
  Input as AriaInput,
  Label as AriaLabel,
  Text as AriaText,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  type ValidationResult,
} from 'react-aria-components';

import styles from './TextField.module.css';

export interface TextFieldProps extends AriaTextFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'search';
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, description, errorMessage, placeholder, type = 'text', className, ...props }, ref) => {
    return (
      <AriaTextField {...props} className={clsx(styles.field, className)}>
        {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
        <AriaInput ref={ref} type={type} placeholder={placeholder} className={styles.input} />
        {description && (
          <AriaText slot="description" className={styles.description}>
            {description}
          </AriaText>
        )}
        <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
      </AriaTextField>
    );
  },
);

TextField.displayName = 'TextField';
