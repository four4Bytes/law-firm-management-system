import { GoogleButton } from "../GoogleButton/GoogleButton";
import styles from "./LoginCard.module.css";

export function LoginCard() {
  return (
    <div className={styles.card}>
      <div className={styles.logoContainer}>Logo</div>
      <div className={styles.textContainer}>
        <h1 className={styles.title}>Anino Law &amp; Real Estate Firm </h1>

        <h2 className={styles.description}>Management System</h2>
      </div>
      <p className={styles.instruction}>
        Please sign in using your work google email address.
      </p>
      <GoogleButton />
      <p className={styles.note}>Single Sign-On via Google Workspace</p>
    </div>
  );
}
