import { redirect } from "next/navigation";

import { getUsersPaginatedAction } from "@/features/users/actions";
import { UserTable } from "@/features/users/components/UserTable/UserTable";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";

import styles from "./page.module.css";

export default async function UserPage() {
  const session = await auth();
  const userRole = session?.user?.role;

  if (!can(userRole, "user.read")) {
    redirect("/dashboard");
  }

  const initial = await getUsersPaginatedAction({ pageSize: 10 });

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
