"use client";

import { FaBan, FaCalendarCheck, FaCheck, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConsultationStatus } from "@/generated/prisma/browser";

import { CONSULTATION_STATUS_TRANSITIONS } from "../../status";
import styles from "./ConsultationWorkflowActions.module.css";

interface ConsultationWorkflowActionsProps {
  status: ConsultationStatus;
  onChangeStatus: (status: ConsultationStatus) => void;
  isPending?: boolean;
}

interface WorkflowAction {
  target: ConsultationStatus;
  label: string;
  icon: React.ReactNode;
}

const WORKFLOW_ACTIONS: Record<ConsultationStatus, WorkflowAction> = {
  [ConsultationStatus.Accepted]: {
    target: ConsultationStatus.Accepted,
    label: "Accept consultation",
    icon: <FaCheck />,
  },
  [ConsultationStatus.Rejected]: {
    target: ConsultationStatus.Rejected,
    label: "Reject consultation",
    icon: <FaXmark />,
  },
  [ConsultationStatus.Cancelled]: {
    target: ConsultationStatus.Cancelled,
    label: "Cancel consultation",
    icon: <FaBan />,
  },
  [ConsultationStatus.Completed]: {
    target: ConsultationStatus.Completed,
    label: "Mark consultation as completed",
    icon: <FaCalendarCheck />,
  },
  [ConsultationStatus.Scheduled]: {
    target: ConsultationStatus.Scheduled,
    label: "Schedule consultation",
    icon: <FaCheck />,
  },
};

export function ConsultationWorkflowActions({
  status,
  onChangeStatus,
  isPending,
}: ConsultationWorkflowActionsProps) {
  const allowedStatuses = CONSULTATION_STATUS_TRANSITIONS[status] ?? [];

  return (
    <div className={styles.actions}>
      {allowedStatuses.map((targetStatus) => {
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
