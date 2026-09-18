"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { FaArrowRight } from "react-icons/fa6";

import { Link } from "@/components/ui/Link/Link";

import styles from "./RelatedLinkCard.module.css";

interface RelatedLinkCardProps {
  href: string;
  label: string;
  title: string;
  icon?: ReactNode;
  className?: string;
}

export function RelatedLinkCard({ href, label, title, icon, className }: RelatedLinkCardProps) {
  return (
    <Link href={href} className={clsx(styles.card, className)}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
      <span className={styles.title}>{title}</span>
      <FaArrowRight className={styles.arrow} />
    </Link>
  );
}
