import { Suspense } from "react";

import { CaseDetail } from "@/features/cases/components/CaseDetail/CaseDetail";
import { getCaseOverviewById } from "@/features/cases/queries";

import styles from "./page.module.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const overview = await getCaseOverviewById(id);

  return (
    <div className={styles.detailPage}>
      <Suspense fallback={<div>Loading...</div>}>
        <CaseDetail overview={overview} />
      </Suspense>
    </div>
  );
}
