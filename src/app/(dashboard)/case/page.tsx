import { getCasesPaginatedAction } from "@/features/cases/actions";
import { CaseTable } from "@/features/cases/components/CaseTable/CaseTable";
import { CaseStatusFilterParamSchema } from "@/features/cases/schemas";
import { auth } from "@/lib/infra/auth";

import styles from "./page.module.css";

interface CasePageProps {
  searchParams: Promise<{ status?: string | string[] }>;
}

export default async function CasePage({ searchParams }: CasePageProps) {
  const session = await auth();
  const { status } = await searchParams;
  const statuses = CaseStatusFilterParamSchema.parse(status);
  const filters = statuses.length > 0 ? { status: statuses } : undefined;
  const initial = await getCasesPaginatedAction({
    pageSize: 10,
    ...(filters ? { filters } : {}),
  });

  return (
    <div className={styles.wrapper}>
      <CaseTable
        initialCases={initial.cases}
        initialCursor={initial.nextCursor}
        userRole={session?.user?.role ?? null}
      />
    </div>
  );
}
