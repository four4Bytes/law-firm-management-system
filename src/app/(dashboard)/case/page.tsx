import { CaseTable } from "@/features/cases/components/CaseTable/CaseTable";

import styles from "./page.module.css";

export default function CasePage() {
  return (
    <div className={styles.wrapper}>
      <CaseTable fill />
    </div>
  );
}
