import clsx from "clsx";

import styles from "./AssigneeChips.module.css";

interface AssigneeChipsProps {
  assignees: { id: string; name: string }[];
  emptyText?: string;
  className?: string;
}

export function AssigneeChips({ assignees, emptyText = "—", className }: AssigneeChipsProps) {
  if (assignees.length === 0) {
    return <span className={styles.empty}>{emptyText}</span>;
  }

  return (
    <ul className={clsx(styles.chips, className)}>
      {assignees.map(({ id, name }) => (
        <li key={id} className={styles.chip}>
          {name}
        </li>
      ))}
    </ul>
  );
}
