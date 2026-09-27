import { getConsultationsPaginatedAction } from "@/features/consultations/actions";
import { ConsultationTable } from "@/features/consultations/components/ConsultationTable/ConsultationTable";
import { ConsultationStatusFilterParamSchema } from "@/features/consultations/schemas";
import { getActiveUsers } from "@/features/users/queries";
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
  const [initial, users] = await Promise.all([
    getConsultationsPaginatedAction({ pageSize: 10, ...(filters ? { filters } : {}) }),
    getActiveUsers(),
  ]);

  return (
    <div className={styles.wrapper}>
      <ConsultationTable
        initialConsultations={initial.consultations}
        initialCursor={initial.nextCursor}
        users={users}
        userRole={session?.user?.role ?? null}
      />
    </div>
  );
}
