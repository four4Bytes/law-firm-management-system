# Notifications & Reminders

> The current system implementation will be based on this document.
> This is the initial notifications & reminders draft - all rules below are subject to change.

---

## 1. Overview

Every notification is delivered through **two channels** from a single dispatch point:

1. **In-app notification** - a database row (`Notification` model), surfaced in the header bell (unread badge + unread list).
2. **HTML email** - a transactional email, rendered per notification type, sent to each recipient's address.

A `NotificationType` value (see [models.md](./models.md#notification-type)) drives both the in-app row and the email template chosen for it.

Every **dispatched** type is always delivered as a DB row and has an email template. **Email is best-effort, not a durable archive**: a notification can be permanently lost when email delivery fails, the recipient has no email address, or the in-app row is pruned by retention. The bell is a transient unread surface; there is no full history page.

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

| Event                         | Recipients                       | Type           | Notes                                         |
| ----------------------------- | -------------------------------- | -------------- | --------------------------------------------- |
| Case created                  | Case assignees (at creation)     | `CaseAssigned` | Actor included when actor is also an assignee |
| Case updated - assignee added | Only the newly added assignee(s) | `CaseAssigned` | Actor always excluded                         |
| Case updated - other changes  | Remaining current case assignees | `CaseUpdated`  | Actor excluded (their own edit)               |

### Tasks (sub-data of Case)

| Event                        | Recipients             | Type                | Notes                                                           |
| ---------------------------- | ---------------------- | ------------------- | --------------------------------------------------------------- |
| Task created                 | Task assignees         | `TaskAssigned`      | Actor included when actor is also an assignee                   |
| Task updated - status change | Current task assignees | `TaskStatusChanged` | Actor always excluded; newly added assignees get `TaskAssigned` |

### Milestones (sub-data of Case)

| Event                                   | Recipients             | Type                     |
| --------------------------------------- | ---------------------- | ------------------------ |
| Milestone updated - status → `Done`     | **All case assignees** | `MilestoneCompleted`     |
| Milestone updated - other status change | All case assignees     | `MilestoneStatusChanged` |
| Milestone updated - content-only change | All case assignees     | `MilestoneUpdated`       |

> Milestone _creation_ does **not** dispatch any notification. Only updates notify.
> Actor always excluded from milestone events.

### Consultations

| Event                                  | Recipients                               | Type                   | Notes                              |
| -------------------------------------- | ---------------------------------------- | ---------------------- | ---------------------------------- |
| Consultation created                   | Consultation assignees                   | `ConsultationCreated`  | Actor included if also an assignee |
| Consultation updated - assignee joined | Only the newly added assignee(s)         | `ConsultationAssigned` | Actor always excluded              |
| Consultation updated - other changes   | Remaining current consultation assignees | `ConsultationUpdated`  | Actor excluded (own edit)          |

> **Single-notice rule:** each recipient receives exactly **one** notification per event — users newly added to an assignment get the "assigned" notice, existing assignees get the "updated" notice; never both.

---

## 5. Scheduled Reminders (daily cron)

### Trigger

| Deployment           | Trigger                                                                                                                           | Details                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Vercel (serverless)  | Cron job `0 0 * * *` (midnight UTC) → `GET /api/cron/reminders`                                                                   | Authenticated via `Bearer CRON_SECRET`; otherwise 401 |
| Docker / self-hosted | `node-cron` in `src/instrumentation.ts` (midnight app time — `APP_TIMEZONE`, fallback server-local; skipped when `VERCEL` is set) | `noOverlap: true`                                     |

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

The guard (claim/suppress) happens **before** dispatch, within one try/catch per candidate:

- the guard is a conditional update that only wins for records still eligible today — if a concurrent invocation already claimed/suppressed the record, the guard is lost and the candidate is **skipped without dispatching** (a duplicate cron run can never send the same reminder twice);
- dispatch throws → the guard is released (claim reset to `null` / suppression removed), so the record is still eligible for the next daily run;
- the guard release is scoped to the exact value this run wrote (`last_reminded_at = {claimedAt}` / the sentinel), so it never clears a guard won by another invocation.

---

## 6. Retention & Cleanup

- At the start of every `runReminderCheck()`, `pruneNotifications(retentionDays)` deletes every `Notification` row older than `retentionDays`.
- `retentionDays` comes from `NOTIFICATION_RETENTION_DAYS` (env, default `90`).
- Rows are deleted for **all users**, including **unread** ones. There is no separate archive; a pruned row that also failed to email is lost permanently. The bell surface is short-lived.
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
| `CaseAssigned`           | caseAssignedTemplate         | Case Assigned                  |
| `CaseUpdated`            | caseUpdatedTemplate          | Case Updated                   |
| `ConsultationAssigned`   | consultationAssignedTemplate | Consultation Assigned          |

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

| Variable                      | Required   | Default      | Purpose                                                                                                         |
| ----------------------------- | ---------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_REMINDER_DAYS`       | No         | `3`          | Global fallback when a record has no `reminder_days` set                                                        |
| `NOTIFICATION_RETENTION_DAYS` | No         | `90`         | Delete Notification rows older than this                                                                        |
| `CRON_SECRET`                 | Yes (all)  | -            | Bearer secret authenticating `GET /api/cron/reminders`                                                          |
| `APP_TIMEZONE`                | No         | server local | IANA timezone for server-side date/time formatting, the reminder day boundary, and the self-hosted cron trigger |
| `APP_ORIGIN`                  | Yes (prod) | -            | Origin used to build absolute `actionUrl` links in emails                                                       |

---

## 10. Failure & Resilience Semantics (as designed)

1. **Scheduled dispatch failure** leaves the record eligible for the next daily run (no lost reminders; possible back-to-back retries).
2. **Email failure** for one recipient never blocks other recipients or the in-app row (logged only, no retry queue) — if the recipient lacks an email or delivery fails, and the in-app row is later pruned, that notification is gone.
3. **Phase isolation** - prune, milestones, and consultations are independent try/catch scopes.
4. **Once-per-day claim** is a conditional optimistic guard executed **before** dispatch: concurrent duplicate cron invocations can generate at most one delivery per record per day, and a crashed run can at worst delay a reminder to the next daily cycle (never duplicate it). The guard is per-record, not global.
5. Seeded/deactivated developer accounts exist only as a bootstrap mechanism and receive no special notification behavior.
