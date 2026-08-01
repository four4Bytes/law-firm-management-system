import { redirect } from "next/navigation";

import { AuditTable } from "@/features/audit/components/AuditTable/AuditTable";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";

import styles from "./page.module.css";

export default async function AuditPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (!can(role, "activity.read")) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.wrapper}>
      <AuditTable />
    </div>
  );
}
