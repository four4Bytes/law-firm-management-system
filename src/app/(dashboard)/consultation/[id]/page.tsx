import { Suspense } from "react";

import { ConsultationDetail } from "@/features/consultations/components/ConsultationDetail/ConsultationDetail";
import { getConsultationOverviewById } from "@/features/consultations/queries";

import styles from "./page.module.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConsultationDetailPage({ params }: Props) {
  const { id } = await params;
  const overview = await getConsultationOverviewById(id);

  return (
    <div className={styles.detailPage}>
      <Suspense fallback={<div>Loading...</div>}>
        <ConsultationDetail overview={overview} />
      </Suspense>
    </div>
  );
}
