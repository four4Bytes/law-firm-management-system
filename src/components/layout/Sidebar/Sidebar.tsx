"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Consultations", href: "/consultation" },
    { label: "Cases", href: "/case" },
    { label: "Users", href: "/user" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.textContainer}>
        <h1 className={styles.title}>Anino Law &amp; Real Estate Firm</h1>
        <h1 className={styles.desc}>Management System</h1>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="navigation"
            onPress={() => router.push(item.href)}
            data-active={pathname === item.href}
          >
            {item.label}
          </Button>
        ))}
      </nav>
    </aside>
  );
}
