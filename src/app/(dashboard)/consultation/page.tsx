import { ConsultationTable } from "@/features/consultations/components/ConsultationTable/ConsultationTable";
import { getConsultationsPaginated } from "@/features/consultations/queries";

import styles from "./page.module.css";

export default async function ConsultationPage() {
  const initial = await getConsultationsPaginated({ pageSize: 10 });

  return (
    <div className={styles.wrapper}>
      <ConsultationTable
        initialConsultations={initial.consultations}
        initialCursor={initial.nextCursor}
      />
    </div>
  );
}
