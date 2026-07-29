import { redirect } from "next/navigation";

import { AuditTable } from "@/features/audit/components/AuditTable/AuditTable";
import { Role } from "@/generated/prisma/browser";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/role-utils";

import styles from "./page.module.css";

export default async function AuditPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (!hasRole(role, Role.Admin, Role.Dev, Role.BranchManager)) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.wrapper}>
      <AuditTable />
    </div>
  );
}
