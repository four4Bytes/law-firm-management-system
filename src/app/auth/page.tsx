import LoginCard from "@/components/auth/LoginCard/LoginCard";
import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <div className={styles.loginPage}>
      <LoginCard />
    </div>
  );
}
