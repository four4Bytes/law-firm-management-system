import clsx from "clsx";

import { StatusDot } from "@/components/ui/StatusDot/StatusDot";

import styles from "./UserChips.module.css";

interface UserChipsProps {
  users: { id: string; name: string; is_online: boolean }[];
  emptyText?: string;
  className?: string;
}

export function UserChips({ users, emptyText = "—", className }: UserChipsProps) {
  if (users.length === 0) {
    return <span className={styles.empty}>{emptyText}</span>;
  }

  return (
    <ul className={clsx(styles.chips, className)}>
      {users.map(({ id, name, is_online }) => (
        <li key={id} className={styles.chip}>
          <StatusDot isOnline={is_online} />
          {name}
        </li>
      ))}
    </ul>
  );
}
