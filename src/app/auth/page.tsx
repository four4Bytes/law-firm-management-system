"use client";

import { LoginCard } from "@/components/layout/LoginCard/LoginCard";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className={styles.loginPage}>
      <LoginCard onClick={() => router.push("/dashboard")} />
    </div>
  );
}
