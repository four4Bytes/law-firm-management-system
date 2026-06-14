import { ConsultationTable } from "@/features/consultations/components/ConsultationTable/ConsultationTable";

import styles from "./page.module.css";

export default function ConsultationPage() {
  return (
    <div className={styles.wrapper}>
      <ConsultationTable />
    </div>
  );
}
