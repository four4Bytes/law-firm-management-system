import Image from "next/image";
import styles from "./page.module.css";
import Logo from "@/assets/images/LogoWhiteBckgd.png";
import { SignInButton } from "@/features/auth/components/SignInButton/SignInButton";

export default function LoginPage() {
  return (
    <div className={styles.loginPage}>
      <div className={styles.card}>
        <Image
          src={Logo}
          alt="Anino Law & Real Estate Firm Logo"
          className={styles.logo}
          width={100}
          preload={true}
        />
        <div className={styles.textContainer}>
          <h1 className={styles.title}>Anino Law &amp; Real Estate Firm</h1>
          <h2 className={styles.description}>Management System</h2>
        </div>
        <p className={styles.instruction}>
          Please sign in using your work or personal Google email address.
        </p>

        <SignInButton />

        <p className={styles.note}>Single Sign-On via Google Workspace</p>
      </div>
    </div>
  );
}
