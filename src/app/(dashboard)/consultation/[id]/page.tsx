import { Suspense } from "react";

import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { getConsultationOverviewByIdAction } from "@/features/consultations/actions";
import { ConsultationDetail } from "@/features/consultations/components/ConsultationDetail/ConsultationDetail";
import { auth } from "@/lib/auth";

import styles from "./page.module.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConsultationDetailPage({ params }: Props) {
  const { id } = await params;
  const { overview, access } = await getConsultationOverviewByIdAction(id);
  const session = await auth();

  return (
    <div className={styles.detailPage}>
      <Suspense fallback={<ProgressCircle aria-label="Loading..." />}>
        <ConsultationDetail
          overview={overview}
          access={access}
          userRole={session?.user?.role ?? null}
        />
      </Suspense>
    </div>
  );
}
