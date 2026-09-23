import { getConsultationsPaginatedAction } from "@/features/consultations/actions";
import { ConsultationTable } from "@/features/consultations/components/ConsultationTable/ConsultationTable";
import { ConsultationStatusFilterParamSchema } from "@/features/consultations/schemas";
import { auth } from "@/lib/infra/auth";

import styles from "./page.module.css";

interface ConsultationPageProps {
  searchParams: Promise<{ status?: string | string[] }>;
}

export default async function ConsultationPage({ searchParams }: ConsultationPageProps) {
  const session = await auth();
  const { status } = await searchParams;
  const statuses = ConsultationStatusFilterParamSchema.parse(status);
  const filters = statuses.length > 0 ? { status: statuses } : undefined;
  const initial = await getConsultationsPaginatedAction({
    pageSize: 10,
    ...(filters ? { filters } : {}),
  });

  return (
    <div className={styles.wrapper}>
      <ConsultationTable
        initialConsultations={initial.consultations}
        initialCursor={initial.nextCursor}
        userRole={session?.user?.role ?? null}
      />
    </div>
  );
}
