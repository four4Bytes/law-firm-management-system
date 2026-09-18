import clsx from "clsx";

import styles from "./StatusDot.module.css";

interface StatusDotProps {
  isOnline: boolean;
  className?: string;
}

export function StatusDot({ isOnline, className }: StatusDotProps) {
  return (
    <span aria-hidden="true" className={clsx(styles.dot, isOnline && styles.online, className)} />
  );
}
