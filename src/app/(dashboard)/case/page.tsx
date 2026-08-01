import { getCasesPaginatedAction } from "@/features/cases/actions";
import { CaseTable } from "@/features/cases/components/CaseTable/CaseTable";

import styles from "./page.module.css";

export default async function CasePage() {
  const initial = await getCasesPaginatedAction({ pageSize: 10 });

  return (
    <div className={styles.wrapper}>
      <CaseTable initialCases={initial.cases} initialCursor={initial.nextCursor} />
    </div>
  );
}
