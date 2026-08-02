import { redirect } from "next/navigation";

import { AuditTable } from "@/features/audit/components/AuditTable/AuditTable";
import { requirePermissionOrNull } from "@/lib/auth-guards";

import styles from "./page.module.css";

export default async function AuditPage() {
  const session = await requirePermissionOrNull("activity.read");

  if (!session) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.wrapper}>
      <AuditTable />
    </div>
  );
}
