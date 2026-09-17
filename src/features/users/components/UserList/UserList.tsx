import clsx from "clsx";

import { StatusDot } from "@/components/ui/StatusDot/StatusDot";

import styles from "./UserList.module.css";

interface UserListItem {
  id: string;
  name: string;
  status?: string;
  is_online?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  Todo: "Working",
  Done: "Done",
  Pending: "Awaiting review",
  Approved: "Approved",
  Rejected: "Changes requested",
};

function formatUserStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
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
      {users.map(({ id, name, status, is_online }) => (
        <li key={id} className={styles.item}>
          <StatusDot isOnline={is_online ?? false} />
          <span className={styles.name}>{name}</span>
          {status && (
            <span className={styles.status} data-status={status}>
              — {formatUserStatus(status)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
