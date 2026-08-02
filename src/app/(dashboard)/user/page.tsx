import { getUsersPaginatedAction } from "@/features/users/actions";
import { UserTable } from "@/features/users/components/UserTable/UserTable";
import { requirePermission } from "@/lib/auth-guards";

import styles from "./page.module.css";

export default async function UserPage() {
  const session = await requirePermission("user.read");

  const initial = await getUsersPaginatedAction({ pageSize: 10 });

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
