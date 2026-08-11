# Notifications & Reminders

> The current system implementation will be based on this document.
> This is the initial notifications & reminders draft - all rules below are subject to change.

---

## 1. Overview

Each notification is delivered from a single dispatch point through two channels:

1. **In-app** — a `Notification` DB row, shown in the header bell (unread badge + list).
2. **Email** — an HTML template rendered per `NotificationType` (see [models.md](./models.md#notification-type)), sent to each recipient.

Every dispatched type writes a DB row and has an email template. **Email is best-effort, not a durable archive**: a missing recipient address or failed email delivery does not remove the in-app row — it stays available until normal retention pruning. A notification is lost only when its row is pruned by retention. The bell is a transient unread surface — there is no history page.

---

## 2. Dispatch Pipeline

All notifications pass through `dispatchNotifications(payload, actorUserId, notifyActor = false)` in `src/features/notifications/dispatch.ts`, in order:

1. **Actor exclusion** — the actor is removed from recipients unless `notifyActor` is `true`.
2. **Active users only** — deactivated users never receive anything.
3. **Deduplication** — duplicate IDs are collapsed.
4. **Database row** — one `is_read = false` row per recipient.
5. **Email** — per recipient with an address, render the type's template and send. Failures are logged and never block or roll back the row.

Payload: `userIds`, `type`, `title`, `message`, optional `actionUrl`, and related `caseId` / `consultationId` / `milestoneId` / `taskId`.

---

## 3. Recipient Resolution

Recipients come only from **assignment** — the users assigned to the record:

| Entity       | Assignment source        |
| ------------ | ------------------------ |
| Case         | `CaseAssignment`         |
| Task         | `TaskAssignment`         |
| Consultation | `ConsultationAssignment` |

Only **active** users are eligible; recipients are per-event, not role-based ([section 4](#4-event-driven-notifications-immediate)). By default the acting user (_actor_) is excluded from their own notification unless the dispatch site passes `notifyActor`.

---

## 4. Event-Driven Notifications (immediate)

Fired by Server Actions in `after()` callbacks after the mutation succeeds (audited, non-blocking).

> Creation and deletion never dispatch for any entity type — those are audited, not announced. Immediate notifications cover assignment changes (case/task/consultation), status changes (case/consultation/milestone), and the Accepted→New Case consultation transition.

### Cases

| Event                         | Recipients            | Type                | Notes                 |
| ----------------------------- | --------------------- | ------------------- | --------------------- |
| Case updated - assignee added | Newly added assignees | `CaseAssigned`      | Actor always excluded |
| Case status changed           | All case assignees    | `CaseStatusChanged` | Actor always excluded |

> Any status transition (incl. → `Closed`/`Settled`/`Terminated`) notifies; creation, deletion, and content-only edits dispatch nothing. The message states the change as `from <before> to <after>` (e.g. `from Open to Closed`). Actor always excluded.

### Tasks (sub-data of Case)

| Event                         | Recipients            | Type           | Notes                 |
| ----------------------------- | --------------------- | -------------- | --------------------- |
| Task updated - assignee added | Newly added assignees | `TaskAssigned` | Actor always excluded |

### Milestones (sub-data of Case)

| Event                    | Recipients         | Type                     |
| ------------------------ | ------------------ | ------------------------ |
| Milestone status changed | All case assignees | `MilestoneStatusChanged` |

> Any status transition (incl. → `Done`) notifies; creation, deletion, and content-only edits dispatch nothing. The message states the change as `from <before> to <after>` (e.g. `from Pending to Done`). Actor always excluded.

### Consultations

| Event                                  | Recipients                 | Type                        | Notes                 |
| -------------------------------------- | -------------------------- | --------------------------- | --------------------- |
| Consultation updated - assignee joined | Newly added assignees      | `ConsultationAssigned`      | Actor always excluded |
| Consultation status changed            | All consultation assignees | `ConsultationStatusChanged` | Actor always excluded |

> Any status transition (incl. → `Accepted`/`Completed`/`Rejected`) notifies; creation, deletion, and content-only edits dispatch nothing. The message states the change as `from <before> to <after>` (e.g. `from Scheduled to Accepted`). Actor always excluded.
>
> **Accepted = New Case:** when a consultation transitions to `Accepted`, a new case is created from it. The status-change notification fires on the transition; the case creation itself dispatches nothing (creation is audited, not announced). If the user cancels case creation, the status reverts to the previous value and the revert dispatches its own status-change notification (`from Accepted to <previous>`).
>
> **Single-notice rule:** each recipient gets at most one assignment notice per event.

---

## 5. Scheduled Reminders (daily cron)

### Trigger

| Deployment           | Trigger                                                                                                                            | Details                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Vercel               | Cron `0 0 * * *` (UTC) → `GET /api/cron/reminders`                                                                                 | `Bearer CRON_SECRET` required; else 401 |
| Docker / self-hosted | `node-cron` in `src/instrumentation.ts` at midnight app time (`APP_TIMEZONE`, fallback server-local; skipped when `VERCEL` is set) | `noOverlap: true`                       |

Both paths call `runReminderCheck()` in `src/features/reminders/scheduler.ts`, running three **isolated** phases in order — a phase failure is logged and does not stop the next:

1. **Prune** — delete notifications older than `NOTIFICATION_RETENTION_DAYS`.
2. **Milestones** — process milestone reminders.
3. **Consultations** — process consultation reminders.

### Candidate & window

A milestone/consultation is a candidate when its status is `Pending`/`Scheduled` **and** `last_reminded_at` is `null` or before today (qualifies once per day). Window: `reminder_days` (or `DEFAULT_REMINDER_DAYS`, default 3); `threshold = now + reminder_days * 24h`; `due soon` = due within threshold (future), `overdue` = due before now; outside both → skipped. Message dates use `formatDate`/`formatDateTime`.

### Milestones

| State        | Type               | Recipients     | Guard                                                                      |
| ------------ | ------------------ | -------------- | -------------------------------------------------------------------------- |
| Due soon     | `MilestoneDueSoon` | Case assignees | Claim first (`last_reminded_at = now`); failed dispatch releases the claim |
| Overdue      | `MilestoneOverdue` | Case assignees | Suppress first (`last_reminded_at = 9999-12-31`); failed dispatch retracts |
| No assignees | - (skipped)        | -              | -                                                                          |

### Consultations

| State                                  | Type                   | Recipients             | Guard                                           |
| -------------------------------------- | ---------------------- | ---------------------- | ----------------------------------------------- |
| Upcoming                               | `ConsultationReminder` | Consultation assignees | Claim first; failed dispatch releases the claim |
| Overdue                                | `ConsultationOverdue`  | Consultation assignees | Suppress first; failed dispatch retracts it     |
| No assignees / `Cancelled`/`Completed` | - (skipped)            | -                      | -                                               |

### Re-arm on reschedule

`update` recomputes a `resetReminderTiming` flag: when the due/booking datetime or `reminder_days` changes, `last_reminded_at` resets to `null`, re-arming the reminder window and overdue suppression for the new date.

### Failure semantics

The guard runs **before** dispatch, in one try/catch per candidate:

- it is a conditional update that only wins for records still eligible — a concurrent invocation that already claimed/suppressed wins, and this run **skips** (concurrent cron runs never double-send);
- dispatch throws → the guard is released (claim reset to `null` / suppression removed), so the record stays eligible next run;
- release is scoped to the exact value this run wrote, so it never clears another invocation's guard.

---

## 6. Retention & Cleanup

At the start of each `runReminderCheck()`, `pruneNotifications(retentionDays)` deletes `Notification` rows older than `retentionDays` (`NOTIFICATION_RETENTION_DAYS`, default 90) — **all users**, unread included, with no archive: a row that also failed to email is lost permanently. Cutoff is `created_at`; a prune failure is logged and does not stop processing. The bell intentionally has no paginated history ([Overview](#1-overview)).

---

## 7. Email Templates

All templates live in `src/lib/email-templates.ts`. Every dispatched type maps to one:

| Notification type           | Template                     | Email subject (heading)        |
| --------------------------- | ---------------------------- | ------------------------------ |
| `ConsultationReminder`      | consultationReminderTemplate | Upcoming Consultation Reminder |
| `ConsultationOverdue`       | consultationOverdueTemplate  | Overdue Consultation           |
| `MilestoneDueSoon`          | milestoneTemplate            | (uses notification title)      |
| `MilestoneOverdue`          | milestoneTemplate            | (uses notification title)      |
| `MilestoneStatusChanged`    | statusChangeTemplate         | (uses notification title)      |
| `TaskAssigned`              | taskAssignedTemplate         | Task Assigned                  |
| `CaseAssigned`              | caseAssignedTemplate         | Case Assigned                  |
| `CaseStatusChanged`         | statusChangeTemplate         | (uses notification title)      |
| `ConsultationAssigned`      | consultationAssignedTemplate | Consultation Assigned          |
| `ConsultationStatusChanged` | statusChangeTemplate         | (uses notification title)      |

- Relative `actionUrl` values resolve against `APP_ORIGIN` (env, required for emails).
- `MilestoneStatusChanged`, `CaseStatusChanged`, and `ConsultationStatusChanged` emails state the status transition (`from Pending to Done`) in the body.
- All interpolated text is HTML-escaped.
- Recipients without an email are skipped (the in-app row is still created).

---

## 8. Bell UI Behavior

- Badge shows the server-computed unread count, capped visually at `99+`; refreshes every 30 s, on tab visibility change, and on focus.
- Popover loads unread only (30, newest first).
- Clicking an item: marks it read, removes it from the popover, decrements the badge, navigates to `actionUrl` when present.
- "Mark all read" clears all unread and the badge.
- The badge is informative only — authorization stays server-side via `requireAuth()`.

---

## 9. Environment Variables

| Variable                      | Required   | Default      | Purpose                                                                         |
| ----------------------------- | ---------- | ------------ | ------------------------------------------------------------------------------- |
| `DEFAULT_REMINDER_DAYS`       | No         | `3`          | Fallback when a record has no `reminder_days`                                   |
| `NOTIFICATION_RETENTION_DAYS` | No         | `90`         | Delete Notification rows older than this                                        |
| `CRON_SECRET`                 | Yes (all)  | -            | Bearer secret for `GET /api/cron/reminders`                                     |
| `APP_TIMEZONE`                | No         | server local | IANA timezone: date formatting, reminder day boundary, self-hosted cron trigger |
| `APP_ORIGIN`                  | Yes (prod) | -            | Origin for absolute `actionUrl` links in emails                                 |

---

## 10. Failure & Resilience Semantics

1. **Scheduled failure** — the record stays eligible for the next run (no lost reminders; possible retry next day).
2. **Email failure** — never blocks other recipients or the in-app row (logged only, no retry queue); a failed/absent email plus a pruned row means the notification is gone.
3. **Phase isolation** — prune, milestones, and consultations each run in their own try/catch.
4. **Once-per-day claim** — an optimistic, per-record guard run **before** dispatch; concurrent runs at most deliver once, a crashed run delays to the next cycle, never duplicates.
5. **Developer accounts** — seeded/deactivated accounts are bootstrap-only and get no special notification behavior.
