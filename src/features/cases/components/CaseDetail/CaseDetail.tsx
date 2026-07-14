"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { queue } from "@/components/ui/Toast/Toast";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { getCaseForEditAction } from "@/features/cases/actions";
import { EditCaseModal } from "@/features/cases/components/EditCaseModal/EditCaseModal";
import type { CaseEditData, CaseOverviewData } from "@/features/cases/queries";
import { getClientForEditAction } from "@/features/clients/actions";
import type { ClientEditData } from "@/features/clients/queries";

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
}

export function CaseDetail({ overview }: Props) {
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editData, setEditData] = useState<{
    caseData: CaseEditData;
    clientData: ClientEditData;
  } | null>(null);

  const validTabs = [
    "tasks",
    "notes",
    "attachments",
    "milestones",
    "payments",
    "activity",
  ] as const;
  type ValidTab = (typeof validTabs)[number];
  const tabParam = searchParams.get("tab");
  const selectedKey = tabParam && validTabs.includes(tabParam as ValidTab) ? tabParam : "tasks";

  const handleSelectionChange = (key: React.Key) => {
    startLoading();
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  async function handleEdit() {
    try {
      const caseData = await getCaseForEditAction(overview.id);
      if (!caseData) throw new Error("Case not found");
      const clientData = await getClientForEditAction(caseData.client_id);
      if (!clientData) throw new Error("Client not found");
      setEditData({ caseData, clientData });
    } catch {
      queue.add({ title: "Failed to load case data" }, { timeout: 5000 });
    }
  }

  return (
    <div className={styles.detail}>
      <Link href="/case" className={styles.backLink}>
        <FaArrowLeft /> Back to Cases
      </Link>

      <CaseOverview data={overview} onEdit={handleEdit} />

      <Tabs selectedKey={selectedKey} onSelectionChange={handleSelectionChange}>
        <TabList aria-label="Case details">
          <Tab id="tasks">Tasks</Tab>
          <Tab id="notes">Notes</Tab>
          <Tab id="attachments">Attachments</Tab>
          <Tab id="milestones">Milestone</Tab>
          <Tab id="payments">Payment Log</Tab>
          <Tab id="activity">Activity Log</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="tasks">
            <TasksTab caseId={overview.id} />
          </TabPanel>
          <TabPanel id="notes">
            <NotesTab caseId={overview.id} />
          </TabPanel>
          <TabPanel id="attachments">
            <AttachmentsTab caseId={overview.id} />
          </TabPanel>
          <TabPanel id="milestones">
            <MilestonesTab caseId={overview.id} />
          </TabPanel>
          <TabPanel id="payments">
            <PaymentsTab caseId={overview.id} />
          </TabPanel>
          <TabPanel id="activity">
            <ActivityLogTab caseId={overview.id} />
          </TabPanel>
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
          onDeleted={() => {
            startLoading();
            setEditData(null);
            router.push("/case");
          }}
          caseData={editData.caseData}
          clientData={editData.clientData}
        />
      )}
    </div>
  );
}
