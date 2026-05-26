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

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Header userImage={session?.user?.image ?? null} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
