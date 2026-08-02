"use client";

import { useEffect } from "react";

import { Link } from "@/components/ui/Link/Link";

import styles from "./error.module.css";

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function DashboardError({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isForbidden = error.digest === "FORBIDDEN";

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>{isForbidden ? "Access denied" : "Something went wrong"}</h1>
        <p className={styles.message}>
          {isForbidden
            ? "You don't have access to this record. Ask a manager to assign you if you should be able to view it."
            : error.message}
        </p>
        <div className={styles.actions}>
          {!isForbidden && <Link onPress={unstable_retry}>Try again</Link>}
          <Link href="/dashboard">Go to Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
