"use client";

import { Button } from "@/components/ui/Button/Button";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";

import styles from "./WorkflowButtons.module.css";

export interface WorkflowButton<T extends string> {
  value: T;
  label: string;
  icon: React.ReactNode;
}

interface WorkflowButtonsProps<T extends string> {
  buttons: WorkflowButton<T>[];
  onSelect: (value: T) => void;
  pendingValue?: T;
}

export function WorkflowButtons<T extends string>({
  buttons,
  onSelect,
  pendingValue,
}: WorkflowButtonsProps<T>) {
  if (buttons.length === 0) {
    return null;
  }

  return (
    <div className={styles.actions}>
      {buttons.map((button) => (
        <TooltipTrigger key={button.value}>
          <Button
            variant="ghost"
            type="button"
            aria-label={button.label}
            onPress={() => onSelect(button.value)}
            isPending={pendingValue === button.value}
            isDisabled={pendingValue !== undefined}
          >
            {button.icon}
          </Button>
          <Tooltip>{button.label}</Tooltip>
        </TooltipTrigger>
      ))}
    </div>
  );
}
