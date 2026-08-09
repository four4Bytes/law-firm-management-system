# Notifications & Reminders

> The current system implementation will be based on this document.

> This is the initial notifications & reminders draft - all rules below are subject to change.

---

## 1. Overview

Every notification is delivered through **two channels** from a single dispatch point:

1. **In-app notification** - a database row (`Notification` model), surfaced in the header bell (unread badge + unread list).
2. **HTML email** - a transactional email, rendered per notification type, sent to each recipient's address.

A `NotificationType` value (see [models.md](./models.md#notification-type)) drives both the in-app row and the email template chosen for it.

No notification can be "silent": every **dispatched** type is always delivered as a DB row and has an email template, so **the email is the durable record**. The bell is a transient unread surface; there is no full history page.

---

## 2. Dispatch Pipeline

All notifications (event-driven and scheduled) go through `dispatchNotifications(payload, actorUserId, notifyActor=false)` in `src/features/notifications/dispatch.ts`, in this order:

1. **Actor exclusion** - when `notifyActor` is `false`, the actor's own ID is removed from the recipient list.
2. **Active users only** - recipients are filtered to users with `is_active = true`. Deactivated users never receive notifications or emails.
3. **Deduplication** - duplicate IDs are collapsed.
4. **Database row** - one `Notification` row is created per recipient with `is_read = false`.
5. **Email** - for each recipient with an email address, the type's template is rendered and sent. Email failures are logged per recipient and never block or roll back the in-app row.

The dispatch payload carries: `userIds`, `type`, `title`, `message`, `actionUrl` (optional), and the related `caseId` / `consultationId` / `milestoneId` / `taskId` (optional).

---

## 3. Recipient Resolution

All recipients are resolved from **assignments** - the users assigned to the record itself:

| Entity       | Assignment source        |
| ------------ | ------------------------ |
| Case         | `CaseAssignment`         |
| Task         | `TaskAssignment`         |
| Consultation | `ConsultationAssignment` |

Only **active users** receive notifications or emails; deactivated users never do. There is no role-based recipient model - the exact per-event recipient set is defined in [section 4](#4-event-driven-notifications-immediate).

**Default rule:** the acting user (the _actor_) is excluded from their own notification unless the dispatch site explicitly passes `notifyActor`.

---

## 4. Event-Driven Notifications (immediate)

Fired by Server Actions, from `after()` callbacks, after the mutation succeeds (audited, non-blocking).

### Cases

| Event        | Recipients                     | Type           | Notes                                                                         |
| ------------ | ------------------------------ | -------------- | ----------------------------------------------------------------------------- |
| Case created | Case assignees (at creation)   | `CaseAssigned` | Actor included when actor is also an assignee                                 |
| Case updated | **All current case assignees** | `CaseAssigned` | Actor excluded (their own edit); new assignees are covered by the same notice |

### Tasks (sub-data of Case)

| Event                         | Recipients                       | Type                | Notes                                         |
| ----------------------------- | -------------------------------- | ------------------- | --------------------------------------------- |
| Task created                  | Task assignees                   | `TaskAssigned`      | Actor included when actor is also an assignee |
| Task updated - status change  | Current task assignees           | `TaskStatusChanged` | Actor always excluded                         |
| Task updated - assignee added | Only the newly added assignee(s) | `TaskAssigned`      | Actor always excluded                         |

### Milestones (sub-data of Case)

| Event                                   | Recipients             | Type                     |
| --------------------------------------- | ---------------------- | ------------------------ |
| Milestone updated - status → `Done`     | **All case assignees** | `MilestoneCompleted`     |
| Milestone updated - other status change | All case assignees     | `MilestoneStatusChanged` |
| Milestone updated - content-only change | All case assignees     | `MilestoneUpdated`       |

> Milestone _creation_ does **not** dispatch any notification. Only updates notify.
> Actor always excluded from milestone events.

### Consultations

| Event                | Recipients                             | Type                  | Notes                                                    |
| -------------------- | -------------------------------------- | --------------------- | -------------------------------------------------------- |
| Consultation created | Consultation assignees                 | `ConsultationCreated` | Actor included if also an assignee                       |
| Consultation updated | **All current consultation assignees** | `ConsultationUpdated` | Actor excluded; new assignees covered by the same notice |

---

## 5. Scheduled Reminders (daily cron)

### Trigger

| Deployment           | Trigger                                                                                            | Details                                               |
| -------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Vercel (serverless)  | Cron job `0 0 * * *` (midnight UTC) → `GET /api/cron/reminders`                                    | Authenticated via `Bearer CRON_SECRET`; otherwise 401 |
| Docker / self-hosted | `node-cron` in `src/instrumentation.ts` (midnight server-local time, skipped when `VERCEL` is set) | `noOverlap: true`                                     |

Both paths call the same `runReminderCheck()` in `src/features/reminders/scheduler.ts`, which runs three phases **in order**, each isolated in its own try/catch:

1. **Prune** - delete notifications older than `NOTIFICATION_RETENTION_DAYS`.
2. **Milestones** - process milestone reminders.
3. **Consultations** - process consultation reminders.

A failure in any phase is logged and does not stop the next phase.

### Reminder eligibility

A milestone or consultation is a _candidate_ when all of:

- its status is `Pending` / `Scheduled`.
- `last_reminded_at` is `null`, or was set before today (each record qualifies **once per day**).

### Window

- `reminder_days` (per record) else `DEFAULT_REMINDER_DAYS` (env, default `3`).
- `threshold = now + reminder_days * 24h`.
- `due soon` = due datetime is within `threshold` and in the future.
- `overdue` = due datetime is before now.
- Outside both windows → skipped (no dispatch, no claim).

### Milestones

| State        | Type               | Recipients     | After dispatch                                                                     |
| ------------ | ------------------ | -------------- | ---------------------------------------------------------------------------------- |
| Due soon     | `MilestoneDueSoon` | Case assignees | `claimMilestoneReminder` → `last_reminded_at = now`                                |
| Overdue      | `MilestoneOverdue` | Case assignees | `suppressMilestoneOverdue` → `last_reminded_at = 9999-12-31` (sentinel, permanent) |
| No assignees | - (skipped)        | -              | -                                                                                  |

### Consultations

| State                                          | Type                   | Recipients             | After dispatch                                         |
| ---------------------------------------------- | ---------------------- | ---------------------- | ------------------------------------------------------ |
| Upcoming                                       | `ConsultationReminder` | Consultation assignees | `claimConsultationReminder` → `last_reminded_at = now` |
| Overdue                                        | `ConsultationOverdue`  | Consultation assignees | `suppressConsultationOverdue` → sentinel, retired      |
| No assignees or `Cancelled`/`Completed` status | - (skipped)            | -                      | -                                                      |

**Message dates** use `formatDate`/`formatDateTime`.

### Re-arm on reschedule

`update` actions recompute a `resetReminderTiming` flag: when the due/booking datetime **or** `reminder_days` changes, `last_reminded_at` is reset to `null`. This re-arms both the reminder window and the overdue suppression, so a rescheduled (previously overdue-suppressed) milestone/consultation gets notified again for its new date.

### Failure semantics

Dispatch happens **before** claiming/suppressing, within one try/catch per candidate:

- dispatch throws → the record is left un-claimed/un-suppressed → it remains eligible for the next daily run.
- claim is idempotent: it only affects records that are still eligible today.

---

## 6. Retention & Cleanup

- At the start of every `runReminderCheck()`, `pruneNotifications(retentionDays)` deletes every `Notification` row older than `retentionDays`.
- `retentionDays` comes from `NOTIFICATION_RETENTION_DAYS` (env, default `90`).
- Rows are deleted for **all users**, including **unread** ones. The email is the archive; the bell surface is short-lived.
- A prune failure is logged and does not stop reminder processing.
- `created_at` is the cutoff basis.

The bell intentionally has **no paginated history** - see [Overview](#1-overview).

---

## 7. Email Templates

All templates live in `src/lib/email-templates.ts`. Every dispatched notification type maps to an HTML template:

| Notification type        | Template                     | Email subject (heading)        |
| ------------------------ | ---------------------------- | ------------------------------ |
| `ConsultationCreated`    | consultationCreatedTemplate  | New Consultation Scheduled     |
| `ConsultationUpdated`    | consultationUpdatedTemplate  | Consultation Updated           |
| `ConsultationReminder`   | consultationReminderTemplate | Upcoming Consultation Reminder |
| `ConsultationOverdue`    | consultationOverdueTemplate  | Overdue Consultation           |
| `MilestoneDueSoon`       | milestoneTemplate            | (uses notification title)      |
| `MilestoneOverdue`       | milestoneTemplate            | (uses notification title)      |
| `MilestoneCompleted`     | milestoneTemplate            | (uses notification title)      |
| `MilestoneStatusChanged` | milestoneTemplate            | (uses notification title)      |
| `MilestoneUpdated`       | milestoneTemplate            | (uses notification title)      |
| `TaskAssigned`           | taskAssignedTemplate         | Task Assigned                  |
| `TaskStatusChanged`      | taskUpdatedTemplate          | Task Updated                   |
| `CaseAssigned`           | caseAssignedTemplate         | New Case Created               |

> `ConsultationAssigned` exists in the `NotificationType` enum but is **not dispatched** and has no template - the `ConsultationUpdated` notice (all current assignees) covers newly added assignees too.

- Relative `actionUrl` values resolve against `APP_ORIGIN` (env, required for emails).
- All interpolated text is HTML-escaped.
- Recipients without an email address are skipped (in-app row still created).

---

## 8. Bell UI Behavior

- The unread badge shows the server-computed initial count, capped visually at `99+`.
- The count refreshes: every 30 seconds, on tab visibility change, and on window focus.
- Opening the popover loads the latest **unread only** notifications (limit 30, newest first).
- Clicking an item: marks it read, removes it from the popover, decrements the badge, and navigates to `actionUrl` when present.
- "Mark all read" marks every unread row of the user and clears the badge.
- The badge is strictly informative - authorization for reads/writes stays on the server via `requireAuth()`.

---

## 9. Environment Variables

| Variable                      | Required   | Default      | Purpose                                                   |
| ----------------------------- | ---------- | ------------ | --------------------------------------------------------- |
| `DEFAULT_REMINDER_DAYS`       | No         | `3`          | Global fallback when a record has no `reminder_days` set  |
| `NOTIFICATION_RETENTION_DAYS` | No         | `90`         | Delete Notification rows older than this                  |
| `CRON_SECRET`                 | Yes (all)  | -            | Bearer secret authenticating `GET /api/cron/reminders`    |
| `APP_TIMEZONE`                | No         | server local | IANA timezone for server-side date/time formatting        |
| `APP_ORIGIN`                  | Yes (prod) | -            | Origin used to build absolute `actionUrl` links in emails |

---

## 10. Failure & Resilience Semantics (as designed)

1. **Scheduled dispatch failure** leaves the record eligible for the next daily run (no lost reminders; possible back-to-back retries).
2. **Email failure** for one recipient never blocks other recipients or the in-app row (logged only).
3. **Phase isolation** - prune, milestones, and consultations are independent try/catch scopes.
4. **Once-per-day claim** is an optimistic concurrency guard (claim is conditional on still being un-claimed today) and is the only idempotency mechanism - there is no global lock; duplicate cron invocations within the same day can duplicate emails for the same record.
5. Seeded/deactivated developer accounts exist only as a bootstrap mechanism and receive no special notification behavior.
