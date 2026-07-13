import { UserTable } from "@/features/users/components/UserTable/UserTable";
import { getUsersPaginated } from "@/features/users/queries";
import { auth } from "@/lib/auth";

import styles from "./page.module.css";

export default async function UserPage() {
  const [session, initial] = await Promise.all([auth(), getUsersPaginated({ pageSize: 10 })]);

  return (
    <div className={styles.wrapper}>
      <UserTable
        users={initial.users}
        initialCursor={initial.nextCursor}
        sessionUserRole={session?.user?.role ?? undefined}
      />
    </div>
  );
}
