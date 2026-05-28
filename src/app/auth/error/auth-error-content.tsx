"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import styles from "./AuthErrorPage.module.css";

enum AuthError {
  Configuration = "Configuration",
  AccessDenied = "AccessDenied",
  Verification = "Verification",
  Default = "Default",
}

interface ErrorInfo {
  title: string;
  message: string;
}

const errorMap: Record<string, ErrorInfo> = {
  [AuthError.Configuration]: {
    title: "Something went wrong",
    message:
      "We encountered a problem on our end. Please try signing in again. If the issue persists, contact your administrator.",
  },
  [AuthError.AccessDenied]: {
    title: "Access Denied",
    message:
      "You don't have permission to sign in with this account. Make sure you're using your work email address.",
  },
  [AuthError.Verification]: {
    title: "Link expired",
    message: "This sign-in link is no longer valid. Please go back and try signing in again.",
  },
  [AuthError.Default]: {
    title: "Sign in failed",
    message:
      "We couldn't complete the sign-in. Please try again or contact your administrator if the issue continues.",
  },
};

export function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") as AuthError | null;
  const errorInfo = error ? errorMap[error] : undefined;
  const { title, message } = errorInfo ?? errorMap[AuthError.Default];

  return (
    <div className={styles.content}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <Link href="/" className={styles.link}>
        Back to Sign In
      </Link>
    </div>
  );
}
