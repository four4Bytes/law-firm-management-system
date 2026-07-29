"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { queue } from "@/components/ui/Toast/Toast";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
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
import { Role } from "@/generated/prisma/browser";
import { hasRole } from "@/lib/role-utils";

import styles from "./ConsultationDetail.module.css";
import { ConsultationOverview } from "./ConsultationOverview";
import { ActivityLogTab } from "./tabs/ActivityLogTab";
import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { NotesTab } from "./tabs/NotesTab";
import { PaymentsTab } from "./tabs/PaymentsTab";

interface Props {
  overview: ConsultationOverviewData;
  userRole?: Role | null;
}

export function ConsultationDetail({ overview, userRole }: Props) {
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

  const canViewPayments = hasRole(userRole, Role.Admin, Role.Dev, Role.BranchManager);

  const allTabs = ["attachments", "notes", "payments", "activity"] as const;
  type ValidTab = (typeof allTabs)[number];
  const validTabs = allTabs.filter((t) => t !== "payments" || canViewPayments);
  const tabParam = searchParams.get("tab");
  const selectedKey =
    tabParam && validTabs.includes(tabParam as ValidTab) ? tabParam : "attachments";

  const handleSelectionChange = (key: React.Key) => {
    startLoading();
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
        onEdit={handleEdit}
        onDelete={() => setShowDeleteConfirm(true)}
        isEditPending={isEditPending}
      />

      <Tabs selectedKey={selectedKey} onSelectionChange={handleSelectionChange}>
        <TabList aria-label="Consultation details">
          <Tab id="attachments">Attachments</Tab>
          <Tab id="notes">Notes</Tab>
          {canViewPayments && <Tab id="payments">Payment Log</Tab>}
          <Tab id="activity">Activity Log</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="notes">
            {selectedKey === "notes" && <NotesTab consultationId={overview.id} />}
          </TabPanel>
          <TabPanel id="attachments">
            {selectedKey === "attachments" && <AttachmentsTab consultationId={overview.id} />}
          </TabPanel>
          {canViewPayments && (
            <TabPanel id="payments">
              {selectedKey === "payments" && <PaymentsTab consultationId={overview.id} />}
            </TabPanel>
          )}
          <TabPanel id="activity">
            {selectedKey === "activity" && <ActivityLogTab consultationId={overview.id} />}
          </TabPanel>
        </TabPanels>
      </Tabs>

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
