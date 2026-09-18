"use client";

import { FaBan, FaCalendarCheck, FaCalendarDays, FaCheck, FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConsultationStatus } from "@/generated/prisma/browser";

import { CONSULTATION_STATUS_TRANSITIONS } from "../../status";
import styles from "./ConsultationWorkflowActions.module.css";

interface ConsultationWorkflowActionsProps {
  status: ConsultationStatus;
  hasLinkedCase: boolean;
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
  hasLinkedCase,
  onChangeStatus,
  isPending,
}: ConsultationWorkflowActionsProps) {
  const allowedTargets = [...(CONSULTATION_STATUS_TRANSITIONS[status] ?? [])];
  if (status === ConsultationStatus.Accepted && !hasLinkedCase) {
    allowedTargets.push(ConsultationStatus.Accepted);
  }
  if (allowedTargets.length === 0) {
    return null;
  }

  return (
    <div className={styles.actions}>
      {allowedTargets.map((targetStatus) => {
        const rebook = status === ConsultationStatus.Cancelled;
        const label =
          rebook && targetStatus === ConsultationStatus.Scheduled
            ? "Rebook consultation"
            : WORKFLOW_ACTIONS[targetStatus].label;
        const icon =
          rebook && targetStatus === ConsultationStatus.Scheduled ? (
            <FaCalendarDays />
          ) : (
            WORKFLOW_ACTIONS[targetStatus].icon
          );
        return (
          <Button
            key={targetStatus}
            variant="ghost"
            type="button"
            aria-label={label}
            title={label}
            onPress={() => onChangeStatus(targetStatus)}
            isPending={isPending}
            isDisabled={isPending}
          >
            {icon}
          </Button>
        );
      })}
    </div>
  );
}
