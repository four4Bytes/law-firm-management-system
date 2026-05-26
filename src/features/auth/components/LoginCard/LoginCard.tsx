import { Button } from "@/components/ui/Button/Button";
import { FaGoogle } from "react-icons/fa6";
import Image from "next/image";
import styles from "./LoginCard.module.css";
import Logo from "@/assets/images/LogoWhiteBckgd.png";

interface LoginCardProps {
  onClick?: () => void;
}

export function LoginCard({ onClick }: LoginCardProps) {
  return (
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

      <Button className={styles.button} onClick={onClick}>
        <FaGoogle size={20} />
        Sign in with Google
      </Button>

      <p className={styles.note}>Single Sign-On via Google Workspace</p>
    </div>
  );
}
