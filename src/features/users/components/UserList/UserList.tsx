import clsx from "clsx";

import styles from "./UserList.module.css";

interface UserListItem {
  id: string;
  name: string;
  status?: string;
}

interface UserListProps {
  users: UserListItem[];
  emptyText?: string;
  className?: string;
}

export function UserList({ users, emptyText = "—", className }: UserListProps) {
  if (users.length === 0) return <span className={styles.empty}>{emptyText}</span>;

  return (
    <ul className={clsx(styles.list, className)}>
      {users.map(({ id, name, status }) => (
        <li key={id} className={styles.item}>
          <span className={styles.name}>{name}</span>
          {status && (
            <span className={styles.status} data-status={status}>
              — {status}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
