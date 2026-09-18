import clsx from "clsx";

import styles from "./StatusDot.module.css";

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  isOnline: boolean;
}

export function StatusDot({ isOnline, className, ...props }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={isOnline ? "Online" : "Offline"}
      className={clsx(styles.dot, isOnline && styles.online, className)}
      {...props}
    />
  );
}
