"use client";

import clsx from "clsx";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  FaBars,
  FaClockRotateLeft,
  FaComments,
  FaFolderOpen,
  FaHouse,
  FaUser,
  FaUsers,
  FaX,
} from "react-icons/fa6";

import LogoBlackBckgd from "@/assets/images/LogoBlackBckgd.png";
import { Button } from "@/components/ui/Button/Button";
import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";
import { roleLabels } from "@/features/users/constants";
import type { Role } from "@/generated/prisma/browser";

import { toggleSidebarAction } from "./actions";
import { useSidebar } from "./sidebar-context";
import styles from "./Sidebar.module.css";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: FaHouse },
  { label: "Consultations", href: "/consultation", icon: FaComments },
  { label: "Cases", href: "/case", icon: FaFolderOpen },
  { label: "Users", href: "/user", icon: FaUsers },
  { label: "Activity Log", href: "/audit", icon: FaClockRotateLeft },
] as const;

interface SidebarProps {
  initialCollapsed?: boolean;
  userName?: string | null;
  userRole?: Role | null;
  userImage?: string | null;
}

export function Sidebar({ initialCollapsed = false, userName, userRole, userImage }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [imgError, setImgError] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { startLoading } = useNavigationProgress();
  const { isOpen, close } = useSidebar();

  const handleToggle = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    toggleSidebarAction(nextState);
  };

  const handleNavClick = (href: string) => {
    close();
    if (!pathname.startsWith(href)) {
      startLoading();
      router.push(href);
    }
  };

  return (
    <>
      <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)} data-open={isOpen}>
        <div className={styles.topRow}>
          <Image src={LogoBlackBckgd} alt="Anino Law" className={styles.logo} />
          <Button
            variant="ghost"
            className={styles.closeButton}
            aria-label="Close sidebar"
            onPress={close}
          >
            <FaX />
          </Button>
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
              onPress={() => handleNavClick(item.href)}
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
        <div className={styles.profileSection}>
          <div className={styles.profileAvatar}>
            {userImage && !imgError ? (
              <Image
                src={userImage}
                alt="Profile"
                width={40}
                height={40}
                className={styles.profileAvatarImage}
                onError={() => setImgError(true)}
              />
            ) : (
              <FaUser className={styles.profileAvatarIcon} />
            )}
          </div>
          <div className={styles.profileNameRole}>
            {userName && <span className={styles.profileName}>{userName}</span>}
            {userRole && <span className={styles.profileRole}>{roleLabels[userRole]}</span>}
          </div>
        </div>
        <div className={clsx(styles.version)}>
          <span className={styles.versionLabel}>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </div>
      </aside>
      <div className={styles.backdrop} data-open={isOpen} onClick={close} />
    </>
  );
}
