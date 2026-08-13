import clsx from "clsx";

import styles from "./UserChips.module.css";

interface UserChipsProps {
  users: { id: string; name: string }[];
  emptyText?: string;
  className?: string;
}

export function UserChips({ users, emptyText = "—", className }: UserChipsProps) {
  if (users.length === 0) {
    return <span className={styles.empty}>{emptyText}</span>;
  }

  return (
    <ul className={clsx(styles.chips, className)}>
      {users.map(({ id, name }) => (
        <li key={id} className={styles.chip}>
          {name}
        </li>
      ))}
    </ul>
  );
}
