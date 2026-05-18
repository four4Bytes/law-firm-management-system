"use client";

import {
  SearchField as AriaSearchField,
  Input as AriaInput,
  Label as AriaLabel,
  Text as AriaText,
  FieldError as AriaFieldError,
  type SearchFieldProps as AriaSearchFieldProps,
  type ValidationResult,
} from "react-aria-components";
import { FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/Button/Button";
import styles from "./SearchField.module.css";
import clsx from "clsx";

export interface SearchFieldProps extends AriaSearchFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
}

export function SearchField({
  label,
  description,
  errorMessage,
  placeholder = "Search...",
  className,
  ...props
}: SearchFieldProps) {
  return (
    <AriaSearchField {...props} className={clsx(styles.searchField, className)}>
      {label && <AriaLabel className={styles.label}>{label}</AriaLabel>}
      <FaMagnifyingGlass className={styles.icon} />
      <AriaInput placeholder={placeholder} className={styles.input} />
      <Button variant="ghost" className={styles.clearButton}>
        <FaXmark className={styles.clearIcon} />
      </Button>
      {description && (
        <AriaText slot="description" className={styles.description}>
          {description}
        </AriaText>
      )}
      <AriaFieldError className={styles.error}>{errorMessage}</AriaFieldError>
    </AriaSearchField>
  );
}
