"use client";

import { Button } from "@/components/ui/Button/Button";

import styles from "./WorkflowButtons.module.css";

export interface WorkflowButton<T extends string> {
  value: T;
  label: string;
  icon: React.ReactNode;
}

interface WorkflowButtonsProps<T extends string> {
  buttons: WorkflowButton<T>[];
  onSelect: (value: T) => void;
  isPending?: boolean;
}

export function WorkflowButtons<T extends string>({
  buttons,
  onSelect,
  isPending,
}: WorkflowButtonsProps<T>) {
  if (buttons.length === 0) {
    return null;
  }

  return (
    <div className={styles.actions}>
      {buttons.map((button) => (
        <Button
          key={button.value}
          variant="ghost"
          type="button"
          aria-label={button.label}
          title={button.label}
          onPress={() => onSelect(button.value)}
          isPending={isPending}
          isDisabled={isPending}
        >
          {button.icon}
        </Button>
      ))}
    </div>
  );
}
