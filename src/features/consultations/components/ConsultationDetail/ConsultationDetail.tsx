"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { queue } from "@/components/ui/Toast/Toast";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { ActivityLogTab } from "@/features/audit/components/ActivityLogTab/ActivityLogTab";
import { getClientForEditAction } from "@/features/clients/actions";
import type { ClientEditData } from "@/features/clients/queries";
import {
  deleteConsultationAction,
  getConsultationForEditAction,
} from "@/features/consultations/actions";
import { EditConsultationModal } from "@/features/consultations/components/EditConsultationModal/EditConsultationModal";
import type {
  ConsultationEditData,
  ConsultationOverviewData,
} from "@/features/consultations/queries";
import { AttachmentsTab } from "@/features/documents/components/AttachmentsTab/AttachmentsTab";
import { NotesTab } from "@/features/notes/components/NotesTab/NotesTab";
import { PaymentsTab } from "@/features/payments/components/PaymentsTab/PaymentsTab";
import type { Role } from "@/generated/prisma/browser";
import { can, type AccessContext } from "@/lib/rbac";

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
  const [editData, setEditData] = useState<{
    consultation: ConsultationEditData;
    clientData: ClientEditData;
  } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditPending, setIsEditPending] = useState(false);

  const canEdit = can(userRole, "consultation.update", access);
  const canDelete = can(userRole, "consultation.delete", access);
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
  const [selectedTab, setSelectedTab] = useState<string>(validTabs[0]);
  const selectedKey = validTabs.some((tab) => tab === selectedTab) ? selectedTab : validTabs[0];

  const handleSelectionChange = (key: React.Key) => {
    setSelectedTab(String(key));
  };

  async function handleEdit() {
    setIsEditPending(true);
    try {
      const consultation = await getConsultationForEditAction(overview.id);
      if (!consultation) throw new Error("Consultation not found");
      const clientData = await getClientForEditAction(consultation.client_id);
      if (!clientData) throw new Error("Client not found");
      setEditData({ consultation, clientData });
    } catch {
      queue.add({ title: "Failed to load consultation data" }, { timeout: 5000 });
    } finally {
      setIsEditPending(false);
    }
  }

  async function handleDelete() {
    try {
      const result = await deleteConsultationAction({ consultationId: overview.id });

      if (result.success) {
        setShowDeleteConfirm(false);
        queue.add({ title: "Consultation deleted" }, { timeout: 5000 });
        startLoading();
        router.push("/consultation");
      } else {
        queue.add({ title: result.error ?? "Failed to delete consultation" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete consultation. Please try again." }, { timeout: 5000 });
    }
  }

  return (
    <div className={styles.detail}>
      <Link href="/consultation" className={styles.backLink}>
        <FaArrowLeft /> Back to Consultations
      </Link>

      <ConsultationOverview
        data={overview}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? () => setShowDeleteConfirm(true) : undefined}
        isEditPending={isEditPending}
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
    </div>
  );
}
