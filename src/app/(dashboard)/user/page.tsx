import { UserTable } from "@/features/users/components/UserTable/UserTable";
import { getUsersPaginated } from "@/features/users/queries";
import { Role } from "@/generated/prisma/browser";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/role-utils";

import styles from "./page.module.css";

export default async function UserPage() {
  const session = await auth();
  const userRole = session?.user?.role;

  const canManage = hasRole(userRole, Role.Admin, Role.Dev);
  const initial = canManage
    ? await getUsersPaginated({ pageSize: 10 })
    : { users: [], nextCursor: null };

  return (
    <div className={styles.wrapper}>
      <UserTable
        users={initial.users}
        initialCursor={initial.nextCursor}
        sessionUserRole={userRole ?? undefined}
      />
    </div>
  );
}
