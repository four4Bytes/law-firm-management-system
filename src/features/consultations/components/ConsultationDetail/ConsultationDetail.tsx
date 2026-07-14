"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";
import { queue } from "@/components/ui/Toast/Toast";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { getClientForEditAction } from "@/features/clients/actions";
import type { ClientEditData } from "@/features/clients/queries";
import { getConsultationForEditAction } from "@/features/consultations/actions";
import { EditConsultationModal } from "@/features/consultations/components/EditConsultationModal/EditConsultationModal";
import type {
  ConsultationEditData,
  ConsultationOverviewData,
} from "@/features/consultations/queries";

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
  const { startLoading } = useNavigationProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editData, setEditData] = useState<{
    consultation: ConsultationEditData;
    clientData: ClientEditData;
  } | null>(null);

  const validTabs = ["notes", "attachments", "payments", "activity"] as const;
  type ValidTab = (typeof validTabs)[number];
  const tabParam = searchParams.get("tab");
  const selectedKey = tabParam && validTabs.includes(tabParam as ValidTab) ? tabParam : "notes";

  const handleSelectionChange = (key: React.Key) => {
    startLoading();
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  async function handleEdit() {
    try {
      const consultation = await getConsultationForEditAction(overview.id);
      if (!consultation) throw new Error("Consultation not found");
      const clientData = await getClientForEditAction(consultation.client_id);
      if (!clientData) throw new Error("Client not found");
      setEditData({ consultation, clientData });
    } catch {
      queue.add({ title: "Failed to load consultation data" }, { timeout: 5000 });
    }
  }

  return (
    <div className={styles.detail}>
      <Link href="/consultation" className={styles.backLink}>
        <FaArrowLeft /> Back to Consultations
      </Link>

      <ConsultationOverview data={overview} onEdit={handleEdit} />

      <Tabs selectedKey={selectedKey} onSelectionChange={handleSelectionChange}>
        <TabList aria-label="Consultation details">
          <Tab id="notes">Notes</Tab>
          <Tab id="attachments">Attachments</Tab>
          <Tab id="payments">Payment Log</Tab>
          <Tab id="activity">Activity Log</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="notes">
            {selectedKey === "notes" && <NotesTab consultationId={overview.id} />}
          </TabPanel>
          <TabPanel id="attachments">
            {selectedKey === "attachments" && <AttachmentsTab consultationId={overview.id} />}
          </TabPanel>
          <TabPanel id="payments">
            {selectedKey === "payments" && <PaymentsTab consultationId={overview.id} />}
          </TabPanel>
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
          onDeleted={() => {
            startLoading();
            setEditData(null);
            router.push("/consultation");
          }}
          consultation={editData.consultation}
          clientData={editData.clientData}
        />
      )}
    </div>
  );
}
