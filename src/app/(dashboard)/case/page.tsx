import { CaseTable } from "@/features/cases/components/CaseTable/CaseTable";
import { getCasesPaginated } from "@/features/cases/queries";

import styles from "./page.module.css";

export default async function CasePage() {
  const initial = await getCasesPaginated({ pageSize: 10 });

  return (
    <div className={styles.wrapper}>
      <CaseTable initialCases={initial.cases} initialCursor={initial.nextCursor} />
    </div>
  );
}
