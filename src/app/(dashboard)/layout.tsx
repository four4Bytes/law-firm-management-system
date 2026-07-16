import { cookies } from "next/headers";

import { Header } from "@/components/layout/Header/Header";
import { Sidebar } from "@/components/layout/Sidebar/Sidebar";
import { ToastRegion } from "@/components/ui/Toast/Toast";
import { NavigationProvider } from "@/components/ui/TopProgressBar/navigation-context";
import { TopProgressBar } from "@/components/ui/TopProgressBar/TopProgressBar";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { auth } from "@/lib/auth";

import styles from "./layout.module.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  const initialUnreadCount = session?.user?.id
    ? await getUnreadNotificationCount(session.user.id)
    : 0;

  return (
    <div className={styles.layout}>
      <NavigationProvider>
        <TopProgressBar />
        <Sidebar initialCollapsed={initialCollapsed} />
        <div className={styles.main}>
          <Header
            userImage={session?.user?.image ?? null}
            userName={session?.user?.name}
            userRole={session?.user?.role}
            initialUnreadCount={initialUnreadCount}
          />
          <main className={styles.content}>{children}</main>
        </div>
        <ToastRegion />
      </NavigationProvider>
    </div>
  );
}
