import styles from "./AssigneeChips.module.css";

interface AssigneeChipsProps {
  assignees: { id: string; name: string }[];
  emptyText?: string;
}

export function AssigneeChips({ assignees, emptyText = "—" }: AssigneeChipsProps) {
  if (assignees.length === 0) {
    return <span className={styles.empty}>{emptyText}</span>;
  }

  return (
    <ul className={styles.chips}>
      {assignees.map(({ id, name }) => (
        <li key={id} className={styles.chip}>
          {name}
        </li>
      ))}
    </ul>
  );
}
