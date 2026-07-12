"use client";

import { useNavigationProgress } from "./navigation-context";
import styles from "./TopProgressBar.module.css";

export function TopProgressBar() {
  const { state } = useNavigationProgress();

  return (
    <div className={styles.bar} data-state={state} aria-hidden={state === "idle"}>
      <div className={styles.fill} />
    </div>
  );
}
