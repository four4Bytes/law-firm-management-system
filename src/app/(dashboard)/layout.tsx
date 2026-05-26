import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar/Sidebar";
import { Header } from "@/components/layout/Header/Header";
import styles from "./layout.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const cookieStore = await cookies();
  const initialCollapsed =
    cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <div className={styles.layout}>
      <Sidebar initialCollapsed={initialCollapsed} />
      <div className={styles.main}>
        <Header userImage={session?.user?.image ?? null} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
