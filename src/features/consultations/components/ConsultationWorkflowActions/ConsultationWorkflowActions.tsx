"use client";

import { FaBan, FaCalendarCheck, FaCalendarDays, FaCheck, FaXmark } from "react-icons/fa6";

import { WorkflowButton, WorkflowButtons } from "@/components/ui/WorkflowButtons/WorkflowButtons";
import { ConsultationStatus } from "@/generated/prisma/browser";

import { CONSULTATION_STATUS_TRANSITIONS } from "../../status";

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

function toButton(
  status: ConsultationStatus,
  target: ConsultationStatus,
): WorkflowButton<ConsultationStatus> {
  if (status === ConsultationStatus.Cancelled && target === ConsultationStatus.Scheduled) {
    return { value: target, label: "Rebook consultation", icon: <FaCalendarDays /> };
  }
  const action = WORKFLOW_ACTIONS[target];
  return { value: action.target, label: action.label, icon: action.icon };
}

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

  return (
    <WorkflowButtons
      buttons={allowedTargets.map((target) => toButton(status, target))}
      onSelect={onChangeStatus}
      isPending={isPending}
    />
  );
}
