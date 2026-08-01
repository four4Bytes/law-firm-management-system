"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { queue } from "@/components/ui/Toast/Toast";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { deleteCaseAction, getCaseForEditAction } from "@/features/cases/actions";
import { EditCaseModal } from "@/features/cases/components/EditCaseModal/EditCaseModal";
import type { CaseEditData, CaseOverviewData } from "@/features/cases/queries";
import { getClientForEditAction } from "@/features/clients/actions";
import type { ClientEditData } from "@/features/clients/queries";
import { getActiveUsersAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import type { Role } from "@/generated/prisma/browser";
import { can, type AccessContext } from "@/lib/rbac";

import styles from "./CaseDetail.module.css";
import { CaseOverview } from "./CaseOverview";
import { ActivityLogTab } from "./tabs/ActivityLogTab";
import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { MilestonesTab } from "./tabs/MilestonesTab";
import { NotesTab } from "./tabs/NotesTab";
import { PaymentsTab } from "./tabs/PaymentsTab";
import { TasksTab } from "./tabs/TasksTab";

interface Props {
  overview: CaseOverviewData;
  access?: AccessContext;
  userRole?: Role | null;
}

export function CaseDetail({ overview, access, userRole }: Props) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editData, setEditData] = useState<{
    caseData: CaseEditData;
    clientData: ClientEditData;
    users: ActiveUserSummary[];
  } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditPending, setIsEditPending] = useState(false);

  const canEdit = can(userRole, "case.update", access);
  const canDelete = can(userRole, "case.delete", access);
  const canViewPayments = can(userRole, "payment.read");

  const allTabs = ["attachments", "tasks", "notes", "milestones", "payments", "activity"] as const;
  type ValidTab = (typeof allTabs)[number];
  const validTabs = allTabs.filter((t) => {
    switch (t) {
      case "attachments":
        return can(userRole, "attachment.read", access);
      case "tasks":
        return can(userRole, "task.read", access);
      case "notes":
        return can(userRole, "note.read", access);
      case "milestones":
        return can(userRole, "milestone.read", access);
      case "payments":
        return canViewPayments;
      case "activity":
        return can(userRole, "case.activity.read", access);
    }
  });
  const tabParam = searchParams.get("tab");
  const selectedKey =
    tabParam && validTabs.includes(tabParam as ValidTab)
      ? tabParam
      : (validTabs[0] ?? "attachments");

  const handleSelectionChange = (key: React.Key) => {
    startLoading();
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  async function handleEdit() {
    setIsEditPending(true);
    try {
      const [{ data }, users] = await Promise.all([
        getCaseForEditAction(overview.id),
        getActiveUsersAction(),
      ]);
      if (!data) throw new Error("Case not found");
      const clientData = await getClientForEditAction(data.client_id);
      if (!clientData) throw new Error("Client not found");
      setEditData({ caseData: data, clientData, users });
    } catch {
      queue.add({ title: "Failed to load case data" }, { timeout: 5000 });
    } finally {
      setIsEditPending(false);
    }
  }

  async function handleDelete() {
    try {
      const result = await deleteCaseAction({ caseId: overview.id });

      if (result.success) {
        setShowDeleteConfirm(false);
        queue.add({ title: "Case deleted" }, { timeout: 5000 });
        startLoading();
        router.push("/case");
      } else {
        queue.add({ title: result.error ?? "Failed to delete case" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete case. Please try again." }, { timeout: 5000 });
    }
  }

  return (
    <div className={styles.detail}>
      <Link href="/case" className={styles.backLink}>
        <FaArrowLeft /> Back to Cases
      </Link>

      <CaseOverview
        data={overview}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? () => setShowDeleteConfirm(true) : undefined}
        isEditPending={isEditPending}
      />

      <Tabs selectedKey={selectedKey} onSelectionChange={handleSelectionChange}>
        <TabList aria-label="Case details">
          {validTabs.includes("attachments") && <Tab id="attachments">Attachments</Tab>}
          {validTabs.includes("tasks") && <Tab id="tasks">Tasks</Tab>}
          {validTabs.includes("notes") && <Tab id="notes">Notes</Tab>}
          {validTabs.includes("milestones") && <Tab id="milestones">Milestone</Tab>}
          {validTabs.includes("payments") && <Tab id="payments">Payment Log</Tab>}
          {validTabs.includes("activity") && <Tab id="activity">Activity Log</Tab>}
        </TabList>
        <TabPanels>
          {validTabs.includes("tasks") && (
            <TabPanel id="tasks">
              <TasksTab caseId={overview.id} />
            </TabPanel>
          )}
          {validTabs.includes("notes") && (
            <TabPanel id="notes">
              <NotesTab caseId={overview.id} />
            </TabPanel>
          )}
          {validTabs.includes("attachments") && (
            <TabPanel id="attachments">
              <AttachmentsTab caseId={overview.id} />
            </TabPanel>
          )}
          {validTabs.includes("milestones") && (
            <TabPanel id="milestones">
              <MilestonesTab caseId={overview.id} />
            </TabPanel>
          )}
          {validTabs.includes("payments") && (
            <TabPanel id="payments">
              <PaymentsTab caseId={overview.id} />
            </TabPanel>
          )}
          {validTabs.includes("activity") && (
            <TabPanel id="activity">
              <ActivityLogTab caseId={overview.id} />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {editData && (
        <EditCaseModal
          key={editData.caseData.id}
          isOpen={!!editData}
          onOpenChange={() => setEditData(null)}
          onSuccess={() => {
            setEditData(null);
            router.refresh();
          }}
          caseData={editData.caseData}
          clientData={editData.clientData}
          users={editData.users}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Case"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        This permanently deletes the case and ALL its tasks, milestones, notes, documents,
        assignments, and payments. This action cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
