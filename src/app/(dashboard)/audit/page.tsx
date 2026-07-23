import { AuditTable } from "@/features/audit/components/AuditTable/AuditTable";

import styles from "./page.module.css";

export default function AuditPage() {
  return (
    <div className={styles.wrapper}>
      <AuditTable />
    </div>
  );
}
