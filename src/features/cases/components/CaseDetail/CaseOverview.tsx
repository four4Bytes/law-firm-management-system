"use client";

import clsx from "clsx";
import { FaCalendarCheck, FaPenToSquare } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { RelatedLinkCard } from "@/components/ui/RelatedLinkCard/RelatedLinkCard";
import type { CaseOverviewData } from "@/features/cases/queries";
import { formatDateTime } from "@/lib/date";

import styles from "./CaseOverview.module.css";

interface Props {
  data: CaseOverviewData;
  onEdit?: () => void;
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

export function CaseOverview({ data, onEdit }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>{data.case_title}</h2>
          <span className={clsx(styles.badge, statusClassMap[data.status])}>{data.status}</span>
          {onEdit && (
            <Button
              variant="ghost"
              aria-label="Edit case"
              className={styles.editButton}
              onPress={onEdit}
            >
              <FaPenToSquare /> Edit
            </Button>
          )}
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
              <span className={styles.label}>Case Type</span>
              <span className={styles.value}>{data.case_type}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Latest Milestone</span>
              <span className={styles.value}>
                {data.latestMilestone
                  ? `${data.latestMilestone.title} (${data.latestMilestone.status})`
                  : "—"}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Assigned Staff</span>
              <span className={styles.value}>{data.assignTo || "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Parties Involved</span>
              <span className={styles.value}>{data.parties_involved ?? "—"}</span>
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
          {data.sourceConsultation && (
            <RelatedLinkCard
              href={`/consultation/${data.sourceConsultation.id}`}
              label="Source Consultation"
              title={data.sourceConsultation.concern}
              icon={<FaCalendarCheck />}
            />
          )}
        </div>
      </div>
    </div>
  );
}
