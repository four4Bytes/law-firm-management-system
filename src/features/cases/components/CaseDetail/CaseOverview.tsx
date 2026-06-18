"use client";

import clsx from "clsx";

import overviewStyles from "@/components/ui/OverviewCard/OverviewCard.module.css";
import type { CaseOverviewData } from "@/features/cases/queries";

import styles from "./CaseOverview.module.css";

interface Props {
  data: CaseOverviewData;
}

const statusClassMap: Record<string, string> = {
  Pending: styles.statusPending,
  Open: styles.statusOpen,
  Ongoing: styles.statusOngoing,
  Closed: styles.statusClosed,
  Terminated: styles.statusTerminated,
  Settled: styles.statusSettled,
  Done: styles.statusDone,
  Cancelled: styles.statusCancelled,
};

export function CaseOverview({ data }: Props) {
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));

  return (
    <div className={overviewStyles.card}>
      <div className={overviewStyles.mainContent}>
        <div className={overviewStyles.header}>
          <h2 className={overviewStyles.title}>{data.case_title}</h2>
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
            <span className={overviewStyles.label}>Case Type</span>
            <span className={overviewStyles.value}>{data.case_type}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Latest Milestone</span>
            <span className={overviewStyles.value}>
              {data.latestMilestone
                ? `${data.latestMilestone.title} (${data.latestMilestone.status})`
                : "—"}
            </span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Assigned Staff</span>
            <span className={overviewStyles.value}>{data.assignTo || "—"}</span>
          </div>
          <div className={overviewStyles.field}>
            <span className={overviewStyles.label}>Parties Involved</span>
            <span className={overviewStyles.value}>{data.parties_involved ?? "—"}</span>
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
