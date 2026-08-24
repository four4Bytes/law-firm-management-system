import { redirect } from "next/navigation";

import { AuditTable } from "@/features/audit/components/AuditTable/AuditTable";
import { requirePermission } from "@/lib/auth-guards";

import styles from "./page.module.css";

export default async function AuditPage() {
  try {
    await requirePermission("activity.read");
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className={styles.wrapper}>
      <AuditTable />
    </div>
  );
}
