import { getCasesPaginatedAction } from "@/features/cases/actions";
import { CaseTable } from "@/features/cases/components/CaseTable/CaseTable";
import { CaseStatusFilterParamSchema } from "@/features/cases/schemas";
import { getActiveUsers } from "@/features/users/queries";
import type { UserSummary } from "@/features/users/types";
import { auth } from "@/lib/infra/auth";
import { fulfilledOrNull } from "@/lib/primitives/promise";

import styles from "./page.module.css";

interface CasePageProps {
  searchParams: Promise<{ status?: string | string[] }>;
}

export default async function CasePage({ searchParams }: CasePageProps) {
  const session = await auth();
  const { status } = await searchParams;
  const statuses = CaseStatusFilterParamSchema.parse(status);
  const filters = statuses.length > 0 ? { status: statuses } : undefined;
  const [initialResult, usersResult] = await Promise.allSettled([
    getCasesPaginatedAction({ pageSize: 10, ...(filters ? { filters } : {}) }),
    getActiveUsers(),
  ]);

  const initial = fulfilledOrNull(initialResult);
  if (!initial) throw new Error("Failed to load cases");

  const users: UserSummary[] = fulfilledOrNull(usersResult) ?? [];

  return (
    <div className={styles.wrapper}>
      <CaseTable
        initialCases={initial.cases}
        initialCursor={initial.nextCursor}
        users={users}
        userRole={session?.user?.role ?? null}
      />
    </div>
  );
}
