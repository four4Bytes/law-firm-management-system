import clsx from "clsx";
import type { ReactNode } from "react";
import { FaChevronRight } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";

import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  subtitle?: string;
  href?: string;
  ariaLabel?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  subtitle,
  href,
  ariaLabel,
  className,
}: StatCardProps) {
  const cardClassName = clsx(styles.card, href && styles.link, className);
  const content = (
    <>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {href && <FaChevronRight className={styles.chevron} aria-hidden="true" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
