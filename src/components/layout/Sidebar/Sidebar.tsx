"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  FaHouse,
  FaComments,
  FaFolderOpen,
  FaUsers,
  FaBars,
} from "react-icons/fa6";
import clsx from "clsx";
import { Button } from "@/components/ui/Button/Button";
import { toggleSidebarAction } from "./actions";
import LogoBlackBckgd from "@/assets/images/LogoBlackBckgd.png";
import styles from "./Sidebar.module.css";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: FaHouse },
  { label: "Consultations", href: "/consultation", icon: FaComments },
  { label: "Cases", href: "/case", icon: FaFolderOpen },
  { label: "Users", href: "/user", icon: FaUsers },
] as const;

export function Sidebar({
  initialCollapsed = false,
}: {
  initialCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const pathname = usePathname();
  const router = useRouter();

  const handleToggle = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    toggleSidebarAction(nextState);
  };

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)}>
      <div className={styles.topRow}>
        <Image src={LogoBlackBckgd} alt="Anino Law" className={styles.logo} />
        <Button
          variant="ghost"
          className={styles.toggleButton}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onPress={handleToggle}
        >
          <FaBars />
        </Button>
      </div>
      <div className={styles.textContainer}>
        <h1 className={styles.title}>Anino Law & Real Estate Firm</h1>
        <h1 className={styles.desc}>Management System</h1>
      </div>
      <nav className={styles.navContainer}>
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="navigation"
            className={styles.navButton}
            onPress={() => router.push(item.href)}
            data-active={pathname === item.href}
          >
            <span title={collapsed ? item.label : undefined}>
              <item.icon />
            </span>
            <span className={styles.navLabel}>{item.label}</span>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
