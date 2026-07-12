"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaUser } from "react-icons/fa6";

import { SignOutButton } from "@/features/auth/components/SignOutButton/SignOutButton";
import { roleLabels } from "@/features/users/constants";
import type { Role } from "@/generated/prisma/client";

import styles from "./Header.module.css";

interface HeaderProps {
  userImage: string | null;
  userName?: string | null;
  userRole?: Role | null;
}

export function Header({ userImage, userName, userRole }: HeaderProps) {
  const pathname = usePathname();

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
        <div className={styles.userSection}>
          <div className={styles.userProfile}>
            {userImage ? (
              <Image
                src={userImage}
                alt="Profile"
                width={32}
                height={32}
                className={styles.avatar}
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
