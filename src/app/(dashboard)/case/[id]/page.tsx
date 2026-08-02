import { Suspense } from "react";

import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { getCaseOverviewByIdAction } from "@/features/cases/actions";
import { CaseDetail } from "@/features/cases/components/CaseDetail/CaseDetail";
import { auth } from "@/lib/auth";

import styles from "./page.module.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const { overview, access } = await getCaseOverviewByIdAction(id);
  const session = await auth();

  return (
    <div className={styles.detailPage}>
      <Suspense fallback={<ProgressCircle aria-label="Loading..." />}>
        <CaseDetail overview={overview} access={access} userRole={session?.user?.role ?? null} />
      </Suspense>
    </div>
  );
}
