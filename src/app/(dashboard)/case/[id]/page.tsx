import { Suspense } from "react";

import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { CaseDetail } from "@/features/cases/components/CaseDetail/CaseDetail";
import { getCaseOverviewById } from "@/features/cases/queries";
import { auth } from "@/lib/auth";

import styles from "./page.module.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const overview = await getCaseOverviewById(id);
  const session = await auth();

  return (
    <div className={styles.detailPage}>
      <Suspense fallback={<ProgressCircle aria-label="Loading..." />}>
        <CaseDetail overview={overview} userRole={session?.user?.role} />
      </Suspense>
    </div>
  );
}
