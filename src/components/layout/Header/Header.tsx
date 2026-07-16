"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaUser } from "react-icons/fa6";

import { SignOutButton } from "@/features/auth/components/SignOutButton/SignOutButton";
import { NotificationBell } from "@/features/notifications/components/NotificationBell/NotificationBell";
import { roleLabels } from "@/features/users/constants";
import type { Role } from "@/generated/prisma/browser";

import styles from "./Header.module.css";

interface HeaderProps {
  userImage: string | null;
  userName?: string | null;
  userRole?: Role | null;
  initialUnreadCount: number;
}

export function Header({ userImage, userName, userRole, initialUnreadCount }: HeaderProps) {
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);

  const getPageTitle = (path: string) => {
    if (path.startsWith("/dashboard")) return "Overview";
    if (path.startsWith("/case")) return "Case Management";
    if (path.startsWith("/consultation")) return "Consultation Management";
    if (path.startsWith("/user")) return "User Management";
    return "";
  };

  return (
    <header className={styles.header}>
      <h2 className={styles.pageTitle}>{getPageTitle(pathname || "")}</h2>
      <div className={styles.leftSection}>
        <NotificationBell initialUnreadCount={initialUnreadCount} />
        <div className={styles.userSection}>
          <div className={styles.userProfile}>
            {userImage && !imgError ? (
              <Image
                src={userImage}
                alt="Profile"
                width={32}
                height={32}
                className={styles.avatar}
                onError={() => setImgError(true)}
              />
            ) : (
              <FaUser className={styles.userIcon} />
            )}
          </div>
          <div className={styles.nameRoleContainer}>
            {userName && <span className={styles.userName}>{userName}</span>}
            {userRole && <span className={styles.userRole}>{roleLabels[userRole]}</span>}
          </div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
