"use client";

import { FaArrowLeft } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
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
  return (
    <div className={styles.detail}>
      <Link href="/case" className={styles.backLink}>
        <FaArrowLeft /> Back to Cases
      </Link>

      <CaseOverview data={overview} />

      <Tabs>
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
    </div>
  );
}
