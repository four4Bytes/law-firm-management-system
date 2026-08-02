import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Header } from "@/components/layout/Header/Header";
import { Sidebar } from "@/components/layout/Sidebar/Sidebar";
import { SidebarProvider } from "@/components/layout/Sidebar/sidebar-context";
import { ToastRegion } from "@/components/ui/Toast/Toast";
import { NavigationProvider } from "@/components/ui/TopProgressBar/navigation-context";
import { TopProgressBar } from "@/components/ui/TopProgressBar/TopProgressBar";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { auth } from "@/lib/auth";

import styles from "./layout.module.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  let initialUnreadCount = 0;
  if (session?.user?.id) {
    try {
      initialUnreadCount = await getUnreadNotificationCount(session.user.id);
    } catch {
      initialUnreadCount = 0;
    }
  }

  return (
    <div className={styles.layout}>
      <NavigationProvider>
        <TopProgressBar />
        <SidebarProvider>
          <Sidebar
            initialCollapsed={initialCollapsed}
            userName={session?.user?.name}
            userRole={session?.user?.role}
            userImage={session?.user?.image}
          />
          <div className={styles.main}>
            <Header
              userImage={session?.user?.image ?? null}
              userName={session?.user?.name}
              userRole={session?.user?.role}
              initialUnreadCount={initialUnreadCount}
            />
            <main className={styles.content}>{children}</main>
          </div>
        </SidebarProvider>
        <ToastRegion />
      </NavigationProvider>
    </div>
  );
}
