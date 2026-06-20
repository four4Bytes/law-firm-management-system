"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { FaArrowRight, FaGavel } from "react-icons/fa6";

import type { ConsultationOverviewData } from "@/features/consultations/queries";
import { formatDateTime } from "@/lib/date";

import styles from "./ConsultationOverview.module.css";

interface Props {
  data: ConsultationOverviewData;
}

const statusClassMap: Record<string, string> = {
  Scheduled: styles.statusScheduled,
  Completed: styles.statusCompleted,
  Accepted: styles.statusAccepted,
  Rejected: styles.statusRejected,
  Cancelled: styles.statusCancelled,
};

export function ConsultationOverview({ data }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>{data.concern}</h2>
          <span className={clsx(styles.badge, statusClassMap[data.status])}>{data.status}</span>
        </div>

        <div className={styles.bodyRow}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <span className={styles.label}>Client Name</span>
              <span className={styles.value}>{data.client.name}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Phone</span>
              <span className={styles.value}>{data.client.phone_number ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Email</span>
              <span className={styles.value}>{data.client.email ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Address</span>
              <span className={styles.value}>{data.client.address ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Booking Date & Time</span>
              <span className={styles.value}>{formatDateTime(data.booking_datetime)}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Created By</span>
              <span className={styles.value}>{data.createdBy.name}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Created At</span>
              <span className={styles.value}>{formatDateTime(data.created_at)}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Updated At</span>
              <span className={styles.value}>{formatDateTime(data.updated_at)}</span>
            </div>
          </div>
          {data.relatedCase && (
            <NextLink href={`/case/${data.relatedCase.id}`} className={styles.relatedLink}>
              <FaGavel className={styles.relatedIcon} />
              <span className={styles.relatedLabel}>Related Case</span>
              <span className={styles.relatedTitle}>{data.relatedCase.case_title}</span>
              <FaArrowRight className={styles.relatedArrow} />
            </NextLink>
          )}
        </div>
      </div>
    </div>
  );
}
