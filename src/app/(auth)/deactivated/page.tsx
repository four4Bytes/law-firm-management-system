import { Link } from "@/components/ui/Link/Link";

import styles from "./deactivated.module.css";

interface DeactivatedPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function DeactivatedPage({ searchParams }: DeactivatedPageProps) {
  const { reason } = await searchParams;
  const isDeactivated = reason === "deactivated";

  const title = isDeactivated ? "Account Deactivated" : "Signed Out";
  const message = isDeactivated
    ? "Your account has been deactivated. Please contact your administrator if this is a mistake."
    : "Your session has ended. Please sign in again.";

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        <Link href="/">Back to Sign In</Link>
      </div>
    </main>
  );
}
