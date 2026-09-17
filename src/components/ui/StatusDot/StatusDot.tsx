import clsx from "clsx";

import styles from "./StatusDot.module.css";

interface StatusDotProps {
  isOnline: boolean;
}

export function StatusDot({ isOnline }: StatusDotProps) {
  return <span className={clsx(styles.dot, isOnline && styles.online)} aria-hidden="true" />;
}
