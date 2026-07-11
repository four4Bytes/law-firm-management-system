"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { EditConsultationModal } from "@/features/consultations/components/EditConsultationModal/EditConsultationModal";
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
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <div className={styles.detail}>
      <Link href="/consultation" className={styles.backLink}>
        <FaArrowLeft /> Back to Consultations
      </Link>

      <ConsultationOverview data={overview} onEdit={() => setIsEditOpen(true)} />

      <Tabs>
        <TabList aria-label="Consultation details">
          <Tab id="notes">Notes</Tab>
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

      {isEditOpen && (
        <EditConsultationModal
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          consultationId={overview.id}
          onSuccess={() => {
            setIsEditOpen(false);
            router.refresh();
          }}
          onDeleted={() => {
            setIsEditOpen(false);
            router.push("/consultation");
          }}
        />
      )}
    </div>
  );
}
