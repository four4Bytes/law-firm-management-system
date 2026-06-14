import { UserTable } from "@/features/users/components/UserTable/UserTable";

import styles from "./page.module.css";

export default async function UserPage() {
  return (
    <div className={styles.wrapper}>
      <UserTable />
    </div>
  );
}
