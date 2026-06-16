import { UserTable } from "@/features/users/components/UserTable/UserTable";
import { auth } from "@/lib/auth";

import styles from "./page.module.css";

export default async function UserPage() {
  const session = await auth();

  return (
    <div className={styles.wrapper}>
      <UserTable sessionUserRole={session?.user?.role ?? undefined} />
    </div>
  );
}
