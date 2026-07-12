import { Suspense } from "react";

import { AuthErrorContent } from "./auth-error-content";
import styles from "./AuthErrorPage.module.css";

function AuthErrorPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.message}>Loading error details...</p>}>
        <AuthErrorContent />
      </Suspense>
    </main>
  );
}

export default AuthErrorPage;
