import GoogleButton from "../GoogleButton/GoogleButton";
import styles from "./LoginCard.module.css";

export default function LoginCard() {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Law Firm Management System</h1>
      <GoogleButton />
    </div>
  );
}
