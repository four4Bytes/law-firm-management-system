import { Link } from "@/components/ui/Link/Link";

import styles from "./EntityNotFound.module.css";

interface EntityNotFoundProps {
  entityName: string;
}

export function EntityNotFound({ entityName }: EntityNotFoundProps) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>{entityName} Not Found</h2>
        <p className={styles.message}>
          The {entityName.toLowerCase()} you are looking for does not exist or may have been
          deleted.
        </p>
        <Link href="/dashboard">Go to Dashboard</Link>
      </div>
    </main>
  );
}
