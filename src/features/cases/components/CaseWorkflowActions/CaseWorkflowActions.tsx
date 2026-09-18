"use client";

import { FaBan, FaGavel, FaHandshake, FaRotateLeft } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { CaseStatus } from "@/generated/prisma/browser";

import { CASE_STATUS_TRANSITIONS } from "../../status";
import styles from "./CaseWorkflowActions.module.css";

interface CaseWorkflowActionsProps {
  status: CaseStatus;
  onChangeStatus: (status: CaseStatus) => void;
  isPending?: boolean;
}

interface WorkflowAction {
  target: CaseStatus;
  label: string;
  icon: React.ReactNode;
}

const WORKFLOW_ACTIONS: Record<CaseStatus, WorkflowAction> = {
  [CaseStatus.Open]: {
    target: CaseStatus.Open,
    label: "Reopen case",
    icon: <FaRotateLeft />,
  },
  [CaseStatus.Closed]: {
    target: CaseStatus.Closed,
    label: "Close case",
    icon: <FaGavel />,
  },
  [CaseStatus.Settled]: {
    target: CaseStatus.Settled,
    label: "Settle case",
    icon: <FaHandshake />,
  },
  [CaseStatus.Terminated]: {
    target: CaseStatus.Terminated,
    label: "Terminate case",
    icon: <FaBan />,
  },
};

export function CaseWorkflowActions({
  status,
  onChangeStatus,
  isPending,
}: CaseWorkflowActionsProps) {
  const allowedTargets = [...(CASE_STATUS_TRANSITIONS[status] ?? [])];
  if (allowedTargets.length === 0) {
    return null;
  }

  return (
    <div className={styles.actions}>
      {allowedTargets.map((targetStatus) => {
        const action = WORKFLOW_ACTIONS[targetStatus];
        return (
          <Button
            key={targetStatus}
            variant="ghost"
            type="button"
            aria-label={action.label}
            title={action.label}
            onPress={() => onChangeStatus(targetStatus)}
            isPending={isPending}
            isDisabled={isPending}
          >
            {action.icon}
          </Button>
        );
      })}
    </div>
  );
}
