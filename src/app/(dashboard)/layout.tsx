import { Sidebar } from "@/components/layout/Sidebar/Sidebar";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.userProfile}>A</div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
