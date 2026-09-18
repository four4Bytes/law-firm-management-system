"use client";

import { FaBan, FaGavel, FaHandshake, FaRotateLeft } from "react-icons/fa6";

import { WorkflowButton, WorkflowButtons } from "@/components/ui/WorkflowButtons/WorkflowButtons";
import { CaseStatus } from "@/generated/prisma/browser";

import { CASE_STATUS_TRANSITIONS } from "../../status";

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

function toButton(target: CaseStatus): WorkflowButton<CaseStatus> {
  const action = WORKFLOW_ACTIONS[target];
  return { value: action.target, label: action.label, icon: action.icon };
}

export function CaseWorkflowActions({
  status,
  onChangeStatus,
  isPending,
}: CaseWorkflowActionsProps) {
  const allowedTargets = [...(CASE_STATUS_TRANSITIONS[status] ?? [])];

  return (
    <WorkflowButtons
      buttons={allowedTargets.map(toButton)}
      onSelect={onChangeStatus}
      isPending={isPending}
    />
  );
}
