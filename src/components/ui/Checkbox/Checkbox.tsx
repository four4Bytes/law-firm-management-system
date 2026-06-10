"use client";

import clsx from "clsx";
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components";
import { FaCheck } from "react-icons/fa6";

import styles from "./Checkbox.module.css";

export function Checkbox({ className, ...props }: AriaCheckboxProps) {
  return (
    <AriaCheckbox className={clsx(styles.checkbox, className)} {...props}>
      {({ isSelected, isIndeterminate, isFocusVisible, isDisabled }) => (
        <div
          className={clsx(
            styles.indicator,
            isSelected && styles.isSelected,
            isIndeterminate && styles.isIndeterminate,
            isFocusVisible && styles.isFocusVisible,
            isDisabled && styles.isDisabled,
          )}
        >
          {(isSelected || isIndeterminate) && <FaCheck className={styles.icon} />}
        </div>
      )}
    </AriaCheckbox>
  );
}
