"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DecisionModal } from "@/components/ui/DecisionModal/DecisionModal";
import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { ActivityLogTab } from "@/features/audit/components/ActivityLogTab/ActivityLogTab";
import { CreateCaseFromConsultationModal } from "@/features/cases/components/CreateCaseFromConsultationModal/CreateCaseFromConsultationModal";
import { getClientForEditAction } from "@/features/clients/actions";
import type { ClientEditData } from "@/features/clients/queries";
import {
  changeConsultationStatusAction,
  deleteConsultationAction,
  getConsultationForEditAction,
} from "@/features/consultations/actions";
import { ConsultationWorkflowActions } from "@/features/consultations/components/ConsultationWorkflowActions/ConsultationWorkflowActions";
import { EditConsultationModal } from "@/features/consultations/components/EditConsultationModal/EditConsultationModal";
import type {
  ConsultationEditData,
  ConsultationOverviewData,
} from "@/features/consultations/queries";
import { ConsultationStatusChangePayloadSchema } from "@/features/consultations/schemas";
import { AttachmentsTab } from "@/features/documents/components/AttachmentsTab/AttachmentsTab";
import { NotesTab } from "@/features/notes/components/NotesTab/NotesTab";
import { PaymentsTab } from "@/features/payments/components/PaymentsTab/PaymentsTab";
import { getActiveUsersAction } from "@/features/users/actions";
import type { ActiveUserSummary } from "@/features/users/queries";
import { ConsultationStatus, type Role } from "@/generated/prisma/browser";
import { can, type AccessContext } from "@/lib/rbac";
import {
  toastActionError,
  toastDenied,
  toastError,
  toastNotFound,
  toastSuccess,
} from "@/lib/toast-utils";
import { useStatusWorkflow } from "@/lib/useStatusWorkflow";

import { ConsultationOverview } from "../ConsultationOverview/ConsultationOverview";
import styles from "./ConsultationDetail.module.css";

interface Props {
  overview: ConsultationOverviewData;
  access: AccessContext;
  userRole: Role | null;
}

export function ConsultationDetail({ overview, access, userRole }: Props) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editData, setEditData] = useState<{
    consultation: ConsultationEditData;
    clientData: ClientEditData;
  } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditPending, setIsEditPending] = useState(false);

  const [showCaseModal, setShowCaseModal] = useState(false);
  const [workflowUsers, setWorkflowUsers] = useState<ActiveUserSummary[]>([]);
  const [decisionModal, setDecisionModal] = useState<Extract<
    ConsultationStatus,
    "Rejected" | "Cancelled"
  > | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const canViewPayments = can(userRole, "payment.read");

  const allTabs = ["attachments", "notes", "payments", "activity"] as const;
  const validTabs = allTabs.filter((t) => {
    switch (t) {
      case "attachments":
        return can(userRole, "attachment.read", access);
      case "notes":
        return can(userRole, "note.read", access);
      case "payments":
        return canViewPayments;
      case "activity":
        return can(userRole, "consultation.activity.read", access);
    }
  });
  const requestedTab = searchParams.get("tab");
  const [selectedTab, setSelectedTab] = useState<string>(
    () => validTabs.find((tab) => tab === requestedTab) ?? validTabs[0],
  );
  const selectedKey = validTabs.some((tab) => tab === selectedTab) ? selectedTab : validTabs[0];
  const prevUrlRef = useRef(`${pathname}?${searchParams.toString()}`);

  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    if (currentUrl === prevUrlRef.current) return;
    prevUrlRef.current = currentUrl;
    const next = validTabs.find((tab) => tab === searchParams.get("tab")) ?? validTabs[0];
    setSelectedTab((prev) => (prev === next ? prev : next));
  }, [pathname, searchParams, validTabs]);

  const handleSelectionChange = (key: React.Key) => {
    setSelectedTab(String(key));
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  async function handleEdit() {
    setIsEditPending(true);
    try {
      const consultation = await getConsultationForEditAction(overview.id);
      if (!consultation) {
        toastNotFound("Consultation");
        return;
      }
      const clientData = await getClientForEditAction(consultation.client_id);
      if (!clientData) {
        toastNotFound("Client");
        return;
      }
      setEditData({ consultation, clientData });
    } catch (error) {
      const isForbidden = (error as { digest?: string })?.digest === "FORBIDDEN";
      if (isForbidden) {
        toastDenied();
        return;
      }
      toastError(
        "Failed to load consultation data",
        "Something went wrong while loading this consultation. Please try again.",
      );
    } finally {
      setIsEditPending(false);
    }
  }

  async function handleDelete() {
    try {
      const result = await deleteConsultationAction({ consultationId: overview.id });

      if (result.success) {
        setShowDeleteConfirm(false);
        toastSuccess("Consultation deleted", "The consultation has been deleted.");
        startLoading();
        router.push("/consultation");
      } else {
        toastActionError(result, "delete consultation");
      }
    } catch {
      toastError(
        "Failed to delete consultation",
        "Something went wrong on our end. Please try again.",
      );
    }
  }

  const { isWorkflowPending, runWorkflowTask, applyChange } = useStatusWorkflow({
    operation: "change consultation status",
  });

  async function applyStatusChange(status: ConsultationStatus, reason?: string): Promise<boolean> {
    const succeeded = await applyChange(
      () =>
        changeConsultationStatusAction({
          consultationId: overview.id,
          status,
          ...(reason ? { reason } : {}),
        }),
      `The consultation has been marked as ${status}.`,
    );
    if (succeeded) {
      router.refresh();
    }
    return succeeded;
  }

  async function handleAcceptOpen() {
    await runWorkflowTask(async () => {
      const users = await getActiveUsersAction();
      setWorkflowUsers(users);
      setShowCaseModal(true);
    }, "Failed to accept consultation");
  }

  async function handleDecisionConfirm(reason?: string): Promise<boolean> {
    if (!decisionModal) return false;
    const target = decisionModal;
    const succeeded = await applyStatusChange(target, reason);
    if (succeeded) setDecisionModal(null);
    return succeeded;
  }

  async function handleCompleteConfirm() {
    setShowCompleteConfirm(false);
    await applyStatusChange(ConsultationStatus.Completed);
  }

  async function handleChangeStatus(status: ConsultationStatus) {
    if (status === ConsultationStatus.Accepted) {
      await handleAcceptOpen();
      return;
    }
    if (status === ConsultationStatus.Rejected || status === ConsultationStatus.Cancelled) {
      setDecisionModal(status);
      return;
    }
    if (status === ConsultationStatus.Completed) {
      setShowCompleteConfirm(true);
      return;
    }

    await applyStatusChange(status);
  }

  return (
    <div className={styles.detail}>
      <Link href="/consultation" className={styles.backLink}>
        <FaArrowLeft /> Back to Consultations
      </Link>

      <ConsultationOverview
        data={overview}
        onEdit={handleEdit}
        onDelete={() => setShowDeleteConfirm(true)}
        isEditPending={isEditPending}
        workflowActions={
          <ConsultationWorkflowActions
            status={overview.status as ConsultationStatus}
            hasLinkedCase={overview.relatedCase !== null}
            onChangeStatus={handleChangeStatus}
            isPending={isWorkflowPending}
          />
        }
      />

      {selectedKey ? (
        <Tabs selectedKey={selectedKey} onSelectionChange={handleSelectionChange}>
          <TabList aria-label="Consultation details">
            {validTabs.includes("attachments") && <Tab id="attachments">Attachments</Tab>}
            {validTabs.includes("notes") && <Tab id="notes">Notes</Tab>}
            {validTabs.includes("payments") && <Tab id="payments">Payment</Tab>}
            {validTabs.includes("activity") && <Tab id="activity">Activity Log</Tab>}
          </TabList>
          <TabPanels>
            {validTabs.includes("notes") && (
              <TabPanel id="notes">
                <NotesTab consultationId={overview.id} access={access} userRole={userRole} />
              </TabPanel>
            )}
            {validTabs.includes("attachments") && (
              <TabPanel id="attachments">
                <AttachmentsTab consultationId={overview.id} access={access} userRole={userRole} />
              </TabPanel>
            )}
            {validTabs.includes("payments") && (
              <TabPanel id="payments">
                <PaymentsTab consultationId={overview.id} />
              </TabPanel>
            )}
            {validTabs.includes("activity") && (
              <TabPanel id="activity">
                <ActivityLogTab entityType="Consultation" entityId={overview.id} />
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      ) : (
        <div className={styles.noAccess}>
          You don&apos;t have access to this consultation&apos;s records. Ask a manager to assign
          you to this consultation.
        </div>
      )}

      {editData && (
        <EditConsultationModal
          key={editData.consultation.id}
          isOpen={!!editData}
          onOpenChange={() => setEditData(null)}
          onSuccess={() => {
            setEditData(null);
            router.refresh();
          }}
          consultation={editData.consultation}
          clientData={editData.clientData}
          isLocked={
            overview.status === ConsultationStatus.Accepted && overview.relatedCase !== null
          }
          linkedCaseId={overview.relatedCase?.id ?? null}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Consultation"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        This permanently deletes the consultation and ALL its notes, documents, and payments. Linked
        cases are kept (unlinked). This action cannot be undone.
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title="Mark as completed"
        confirmLabel="Mark completed"
        onConfirm={handleCompleteConfirm}
      >
        Confirm the meeting has been held. The consultation will be ready for an accept or reject
        decision.
      </ConfirmDialog>

      <DecisionModal
        isOpen={decisionModal === ConsultationStatus.Rejected}
        onOpenChange={(open) => {
          if (!open) setDecisionModal(null);
        }}
        title="Reject consultation"
        description="The consultation will be marked as rejected. This cannot be undone. You can still edit its concern, client, and team, but the booking is frozen."
        reasonLabel="Rejection reason"
        reasonPlaceholder="Optional — why is this being rejected?"
        confirmLabel="Reject"
        reasonSchema={ConsultationStatusChangePayloadSchema.shape.reason}
        onConfirm={handleDecisionConfirm}
      />

      <DecisionModal
        isOpen={decisionModal === ConsultationStatus.Cancelled}
        onOpenChange={(open) => {
          if (!open) setDecisionModal(null);
        }}
        title="Cancel consultation"
        description="The consultation will be marked as cancelled. Its booking is frozen, but you can rebook it later. Concern, client, and team stay editable."
        reasonLabel="Cancellation reason"
        reasonPlaceholder="Optional — why is this being cancelled?"
        confirmLabel="Cancel consultation"
        reasonSchema={ConsultationStatusChangePayloadSchema.shape.reason}
        onConfirm={handleDecisionConfirm}
      />

      <CreateCaseFromConsultationModal
        key={overview.id}
        isOpen={showCaseModal}
        onOpenChange={setShowCaseModal}
        onSuccess={(caseId) => {
          setShowCaseModal(false);
          startLoading();
          router.push(`/case/${caseId}`);
        }}
        onCancel={() => setShowCaseModal(false)}
        consultationId={overview.id}
        defaultTitle={overview.concern}
        users={workflowUsers}
      />
    </div>
  );
}
