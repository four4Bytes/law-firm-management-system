"use client";

import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

export function Header() {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.startsWith("/dashboard")) return "Overview";
    if (path.startsWith("/case")) return "Case Management";
    if (path.startsWith("/consultation")) return "Consultation Management";
    if (path.startsWith("/notary")) return "Notary Management";
    return "";
  };

  return (
    <header className={styles.header}>
      <h2 className={styles.pageTitle}>{getPageTitle(pathname || "")}</h2>
      <div className={styles.userProfile}>A</div>
    </header>
  );
}
