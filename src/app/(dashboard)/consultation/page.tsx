import { getConsultationsPaginatedAction } from "@/features/consultations/actions";
import { ConsultationTable } from "@/features/consultations/components/ConsultationTable/ConsultationTable";

import styles from "./page.module.css";

export default async function ConsultationPage() {
  const initial = await getConsultationsPaginatedAction({ pageSize: 10 });

  return (
    <div className={styles.wrapper}>
      <ConsultationTable
        initialConsultations={initial.consultations}
        initialCursor={initial.nextCursor}
      />
    </div>
  );
}
