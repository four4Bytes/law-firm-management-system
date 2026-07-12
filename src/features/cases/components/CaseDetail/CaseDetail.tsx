"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { EditCaseModal } from "@/features/cases/components/EditCaseModal/EditCaseModal";
import type { CaseOverviewData } from "@/features/cases/queries";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const validTabs = ["tasks", "notes", "attachments", "milestones", "payments", "activity"] as const;
  type ValidTab = typeof validTabs[number];
  const tabParam = searchParams.get("tab");
  const selectedKey = tabParam && validTabs.includes(tabParam as ValidTab) ? tabParam : "tasks";

  const handleSelectionChange = (key: React.Key) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={styles.detail}>
      <Link href="/case" className={styles.backLink}>
        <FaArrowLeft /> Back to Cases
      </Link>

      <CaseOverview data={overview} onEdit={() => setIsEditOpen(true)} />

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

      {isEditOpen && (
        <EditCaseModal
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          caseId={overview.id}
          onSuccess={() => {
            setIsEditOpen(false);
            router.refresh();
          }}
          onDeleted={() => {
            setIsEditOpen(false);
            router.push("/case");
          }}
        />
      )}
    </div>
  );
}
