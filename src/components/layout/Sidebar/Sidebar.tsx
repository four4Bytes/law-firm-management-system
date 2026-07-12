"use client";

import clsx from "clsx";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FaBars, FaComments, FaFolderOpen, FaHouse, FaUsers } from "react-icons/fa6";

import LogoBlackBckgd from "@/assets/images/LogoBlackBckgd.png";
import { Button } from "@/components/ui/Button/Button";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";

import { toggleSidebarAction } from "./actions";
import styles from "./Sidebar.module.css";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: FaHouse },
  { label: "Consultations", href: "/consultation", icon: FaComments },
  { label: "Cases", href: "/case", icon: FaFolderOpen },
  { label: "Users", href: "/user", icon: FaUsers },
] as const;

interface SidebarProps {
  initialCollapsed?: boolean;
}

export function Sidebar({ initialCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const pathname = usePathname();
  const router = useRouter();
  const { startLoading } = useNavigationProgress();

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
            onPress={() => {
              if (!pathname.startsWith(item.href)) {
                startLoading();
                router.push(item.href);
              }
            }}
            data-active={pathname.startsWith(item.href)}
            title={collapsed ? item.label : undefined}
          >
            <span>
              <item.icon />
            </span>
            <span className={styles.navLabel}>{item.label}</span>
          </Button>
        ))}
      </nav>
      <div className={clsx(styles.version)}>
        <span className={styles.versionLabel}>
          v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0-dev"}
        </span>
      </div>
    </aside>
  );
}
