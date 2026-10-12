import clsx from "clsx";
import { FaXmark } from "react-icons/fa6";

import { StatusDot } from "@/components/ui/StatusDot/StatusDot";

import styles from "./UserChips.module.css";

interface UserChipsProps {
  users: { id: string; name: string; is_online: boolean }[];
  emptyText?: string;
  className?: string;
  onRemove?: (id: string) => void;
  isDisabled?: boolean;
}

export function UserChips({
  users,
  emptyText = "-",
  className,
  onRemove,
  isDisabled,
}: UserChipsProps) {
  if (users.length === 0) {
    return <span className={styles.empty}>{emptyText}</span>;
  }

  return (
    <ul className={clsx(styles.chips, className)}>
      {users.map(({ id, name, is_online }) => (
        <li key={id} className={styles.chip}>
          <StatusDot isOnline={is_online} />
          <span className={styles.name}>{name}</span>
          {onRemove && (
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${name}`}
              onClick={() => onRemove(id)}
              disabled={isDisabled}
            >
              <FaXmark aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
