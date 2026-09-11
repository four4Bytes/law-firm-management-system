"use client";

import clsx from "clsx";
import {
  Label as AriaLabel,
  RadioGroup as AriaRadioGroup,
  RadioButton,
  RadioField,
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioFieldProps,
  type ValidationResult,
} from "react-aria-components";

import { Description, FieldError } from "@/components/ui/Form/Form";

import styles from "./RadioGroup.module.css";

interface RadioGroupProps extends Omit<AriaRadioGroupProps, "children"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  children?: React.ReactNode;
}

export function RadioGroup({
  label,
  description,
  errorMessage,
  className,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <AriaRadioGroup {...props} className={clsx(styles.group, className)}>
      {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
      {description && <Description>{description}</Description>}
      <div className={styles.list}>{children}</div>
      {errorMessage && <FieldError className={styles.error}>{errorMessage}</FieldError>}
    </AriaRadioGroup>
  );
}

interface RadioProps extends Omit<RadioFieldProps, "children"> {
  description?: string;
  children?: React.ReactNode;
}

export function Radio({ children, description, className, value, ...props }: RadioProps) {
  return (
    <RadioField {...props} value={value} className={clsx(styles.radio, className)}>
      <RadioButton className={styles.indicator}>
        <div className={styles.dot} />
      </RadioButton>
      <div className={styles.content}>
        <span className={styles.text}>{children}</span>
        {description && <span className={styles.radioDescription}>{description}</span>}
      </div>
    </RadioField>
  );
}
