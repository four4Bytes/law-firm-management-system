import { Button } from "@/components/ui/Button/Button";
import { FaGoogle } from "react-icons/fa6";
import styles from "./LoginCard.module.css";

interface LoginCardProps {
  onClick?: () => void;
}

export function LoginCard({ onClick }: LoginCardProps) {
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

      <Button onClick={onClick}>
        <FaGoogle size={20} />
        Sign in with Google
      </Button>

      <p className={styles.note}>Single Sign-On via Google Workspace</p>
    </div>
  );
}
