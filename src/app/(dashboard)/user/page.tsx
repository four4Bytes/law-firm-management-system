import { getUsersPaginatedAction } from "@/features/users/actions";
import { UserTable } from "@/features/users/components/UserTable/UserTable";
import { UserRoleFilterParamSchema } from "@/features/users/schemas";
import { requirePermission } from "@/lib/security/auth-guards";

import styles from "./page.module.css";

interface UserPageProps {
  searchParams: Promise<{ role?: string | string[] }>;
}

export default async function UserPage({ searchParams }: UserPageProps) {
  const session = await requirePermission("user.read");

  const { role } = await searchParams;
  const roles = UserRoleFilterParamSchema.parse(role);
  const filters = roles.length > 0 ? { role: roles } : undefined;
  const initial = await getUsersPaginatedAction({
    pageSize: 10,
    ...(filters ? { filters } : {}),
  });

  return (
    <div className={styles.wrapper}>
      <UserTable
        users={initial.users}
        initialCursor={initial.nextCursor}
        sessionUserRole={session.role}
      />
    </div>
  );
}
