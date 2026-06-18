"use client";

import { FaArrowLeft, FaGavel } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";
import overviewStyles from "@/components/ui/OverviewCard/OverviewCard.module.css";
import { RelatedLinkCard } from "@/components/ui/RelatedLinkCard/RelatedLinkCard";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import type { ConsultationOverviewData } from "@/features/consultations/queries";

import styles from "./ConsultationDetail.module.css";
import { ConsultationOverview } from "./ConsultationOverview";
import { ActivityLogTab } from "./tabs/ActivityLogTab";
import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { NotesTab } from "./tabs/NotesTab";
import { PaymentsTab } from "./tabs/PaymentsTab";

interface Props {
  overview: ConsultationOverviewData;
}

export function ConsultationDetail({ overview }: Props) {
  return (
    <div className={styles.detail}>
      <Link href="/consultation" className={styles.backLink}>
        <FaArrowLeft /> Back to Consultations
      </Link>

      <div className={overviewStyles.overviewRow}>
        <ConsultationOverview data={overview} />
        {overview.relatedCase && (
          <RelatedLinkCard
            href={`/case/${overview.relatedCase.id}`}
            label="Related Case"
            title={overview.relatedCase.case_title}
            icon={<FaGavel />}
          />
        )}
      </div>

      <Tabs>
        <TabList aria-label="Consultation details">
          <Tab id="notes">Notes/Memos</Tab>
          <Tab id="attachments">Attachments</Tab>
          <Tab id="payments">Payment Log</Tab>
          <Tab id="activity">Activity Log</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="notes">
            <NotesTab consultationId={overview.id} />
          </TabPanel>
          <TabPanel id="attachments">
            <AttachmentsTab consultationId={overview.id} />
          </TabPanel>
          <TabPanel id="payments">
            <PaymentsTab consultationId={overview.id} />
          </TabPanel>
          <TabPanel id="activity">
            <ActivityLogTab consultationId={overview.id} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
