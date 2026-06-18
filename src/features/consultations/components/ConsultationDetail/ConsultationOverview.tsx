"use client";

import clsx from "clsx";

import overviewStyles from "@/components/ui/OverviewCard/OverviewCard.module.css";
import type { ConsultationOverviewData } from "@/features/consultations/queries";

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
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));

  return (
    <div className={overviewStyles.card}>
      <div className={overviewStyles.mainContent}>
        <div className={overviewStyles.header}>
          <h2 className={overviewStyles.title}>{data.concern}</h2>
          <span className={clsx(overviewStyles.badge, statusClassMap[data.status])}>
            {data.status}
          </span>
        </div>

        <div className={overviewStyles.grid}>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Client Name</span>
            <span className={overviewStyles.value}>{data.client.name}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Phone</span>
            <span className={overviewStyles.value}>{data.client.phone_number ?? "—"}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Email</span>
            <span className={overviewStyles.value}>{data.client.email ?? "—"}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Address</span>
            <span className={overviewStyles.value}>{data.client.address ?? "—"}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Booking Date & Time</span>
            <span className={overviewStyles.value}>{formatDate(data.booking_datetime)}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Created By</span>
            <span className={overviewStyles.value}>{data.createdBy.name}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Created At</span>
            <span className={overviewStyles.value}>{formatDate(data.created_at)}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Updated At</span>
            <span className={overviewStyles.value}>{formatDate(data.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
