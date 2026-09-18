# Consultation Workflow — Specification

## 1. Overview

A consultation moves `Scheduled → Completed → Accepted/Rejected`, with `Scheduled → Cancelled` as the early exit and `Cancelled → Scheduled` as the rebook path back. Status changes go through one server action (`changeConsultationStatusAction`) driven by header icon buttons — never a dropdown. Terminal statuses (`Accepted`, `Rejected`) are terminal: history is never rewritten; a returning client is a new consultation. Accepting opens the case-creation modal first and flips status + creates the case atomically on submit — cancelling the modal changes nothing. Field edits (client, concern, booking, assignees) are a separate path that never touches status.

## 2. Roles

There are no workflow-specific roles (no creator/reviewer split like tasks). Who can do what is purely permission + assignment based (see [RBAC](./RBAC.md), Consultation Entities):

| Actor                                                                        | Powers                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| User with `consultation.update` on the record (assigned or managerial scope) | Edit fields, change status via workflow buttons, delete (with `consultation.delete`) |
| User with `case.create`                                                      | Create the linked case from an `Accepted` consultation                               |
| Assignees                                                                    | Receive status-change, reschedule, reminder, and overdue notifications               |

Accepting is therefore a two-permission flow: `consultation.update` flips the status, `case.create` creates the case. A user holding only the first can strand a consultation in `Accepted` (§8, Q1).

## 3. Statuses

### `Consultation.status`

| Status      | Meaning (see [Models](./models.md), Consultation Status) |
| ----------- | -------------------------------------------------------- |
| `Scheduled` | Consultation is booked (default for new consultations)   |
| `Completed` | The meeting has taken place                              |
| `Accepted`  | Client accepted — a case may be opened                   |
| `Rejected`  | Client declined or matter not suitable                   |
| `Cancelled` | Consultation was cancelled                               |

### Transition matrix (single source of truth: `CONSULTATION_STATUS_TRANSITIONS` in `src/features/consultations/status.ts`)

| From        | To                       |
| ----------- | ------------------------ |
| `Scheduled` | `Completed`, `Cancelled` |
| `Completed` | `Accepted`, `Rejected`   |
| `Accepted`  | — (terminal)             |
| `Rejected`  | — (terminal)             |
| `Cancelled` | `Scheduled` (rebook)     |

Terminality is derived from the matrix (`isTerminalStatus()` — no outgoing edges), so the two can never disagree. Same-status transitions are rejected (`from !== to` is required). `Cancelled` is deliberately non-terminal: clients rebook after cancelling all the time, and a new record would lose continuity. `Rejected` (firm decision after assessment — a returning client is a new consultation) and `Accepted` (the case owns the lifecycle now) stay terminal.

```
New consultation (Scheduled | Completed*)
         │
         ▼
   ┌───────────┐  meeting held   ┌───────────┐  accept*  ┌──────────┐
   │ Scheduled │ ───────────────→ │ Completed │ ─────────→ │ Accepted │ ──→ Case
   └─────┬─────┘                  └─────┬─────┘            └──────────┘
         │ cancelled                    │ reject                 * atomic: modal first,
         ▼                              ▼                         status+case in one tx
   ┌───────────┐                  ┌──────────┐
   │ Cancelled │ ─── rebook ─────→│ Scheduled│ (same row, status flip; then edit the date)
   └───────────┘                  └──────────┘
                   ┌──────────┐
                   │ Rejected │
                   └──────────┘

* `Completed` at creation is allowed (backfill); `Accepted`/`Rejected`/`Cancelled` are not.
```

### Rules

- **Create** (`ConsultationCreatePayloadSchema`): status is `Scheduled | Completed` only (`Completed` covers backfill of already-held meetings). There is no way to create an `Accepted`/`Rejected`/`Cancelled` consultation. Timing is calendar-day granularity (`isBeforeToday`/`isAfterToday` in `src/lib/date.ts`, app-timezone aware): `Scheduled` refuses days before today, `Completed` refuses days after today — a same-day booking is always allowed, enforced identically server-side (`checkBookingTiming`) and as inline field validation.
- **Edit** (`ConsultationUpdatePayloadSchema` / WithClient variant): carries **no status field**. Field edits can never change status — not even to a legal target.
- **Status change** (`ConsultationStatusChangePayloadSchema`): accepts any enum value plus an optional `reason`; legality is enforced server-side by `isValidConsultationStatusTransition()`. A direct `Accepted` target is always refused — accepting only happens through the atomic accept action (§5). Illegal moves return `conflict / Invalid status change` naming the legal next steps from the current status (`describeConsultationNextSteps()`).
- **Accepted + linked case lock**: once a consultation is `Accepted` **and** has a linked case, status changes AND field edits are refused (`conflict / Consultation already accepted` — "Update the case instead"). The consultation is archival; the case owns the record. An `Accepted` consultation _without_ a case stays editable so it can be healed via the accept flow.
- **Booking lock**: `booking_datetime` can only change while `Scheduled`. The Edit modal disables the date/time fields otherwise (with guidance), and rescheduling while `Scheduled` asks for explicit confirmation showing old → new. Rescheduling to a day before today is refused (same calendar-day rule as creation, enforced server-side and as inline validation — past dates never reach the confirm). Any booking change re-arms reminders (`resetReminderTiming`) and notifies assignees ("rescheduled"). Rebooking a `Cancelled` consultation is a status flip first, then a date edit.
- **Append-only lock**: on `Accepted`/`Rejected`/`Cancelled`, existing notes/files refuse update/delete (`RecordLockedError` → `locked` envelope); creation, reads, and payments stay open. See [Lifecycle](./lifecycle.md).

## 4. Server actions (`src/features/consultations/actions.ts`)

| Action                                                            | Guard order                                                                                                                        | Success side effects (`after`)                                                                                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createConsultationAction` / `createConsultationWithClientAction` | auth → Zod → `consultation.create` (WithClient variant creates client + consultation in one transaction)                           | audit `consultation.created`; `ConsultationAssigned` to initial assignees                                                                                                        |
| `updateConsultationAction` / `updateConsultationWithClientAction` | auth → Zod → not-found → `consultation.update` permission → accepted-with-case lock → booking lock                                 | audit `consultation.updated`; `ConsultationAssigned` to newly added assignees; on booking change, `ConsultationStatusChanged` ("rescheduled") to all assignees + reminder re-arm |
| `changeConsultationStatusAction`                                  | auth → Zod → not-found → `consultation.update` permission → direct-accept refusal → transition gate → accepted-with-case lock      | audit `consultation.status_changed` (`from → to`); `ConsultationStatusChanged` to all assignees; reason (if any) saved as a `Note` in the same transaction                       |
| `acceptConsultationWithCaseAction`                                | auth → Zod → not-found → `consultation.update` permission → `case.create` permission → duplicate → status (`Completed`/`Accepted`) | audit `consultation.accepted` + `case.created`; `ConsultationStatusChanged` to consultation assignees; `CaseAssigned` to case assignees                                          |
| `deleteConsultationAction`                                        | auth → Zod → not-found → `consultation.delete` permission                                                                          | audit `consultation.deleted`; documents purged from storage; linked case **kept, FK set to NULL** (`onDelete: SetNull`)                                                          |

Guards use the throwing helpers (`requireAuth`, `requirePermission`, `requireConsultationPermission`) inside the `try` block; `toActionResponse` maps `ForbiddenError`/`UnauthorizedError` to the standard envelopes. Write failures return `ActionStatusResponse` envelopes surfaced as toasts; reads throw to the error boundary. Unknown failures are sanitized (`Failed to <operation> / Something went wrong…`); `P2025` on delete maps to not-found (deleted-between-check race). The reason note inherits the status-change gate, which is equal-or-stricter than `note.create` for every role ([RBAC](./RBAC.md)).

## 5. Accept → case flow (atomic)

`ConsultationDetail` routes the Accept button to the case modal first; the consultation stays `Completed` until submit:

1. Active users load, `CreateCaseFromConsultationModal` opens (title defaults to the concern; the client is server-derived from the consultation, never submitted).
2. Submit → `acceptConsultationWithCaseAction`, which runs **one transaction**: re-checks (no linked case, status still `Completed`/`Accepted`), flips to `Accepted`, creates the case with `source_consultation_id`. Races resolve to the friendly duplicate conflict.
3. Success navigates to the new case. Cancel closes the modal and changes nothing — there is no revert path because nothing flipped yet.
4. An `Accepted` consultation with no linked case (legacy data, or its case was deleted) shows the Accept button again and heals through the same flow.

## 6. UI

- **Workflow buttons** (`ConsultationWorkflowActions`): ghost icon buttons rendered from the matrix — check (complete), gavel (accept), X (reject), ban (cancel), calendar (rebook on `Cancelled`), accept again on orphan `Accepted`. Terminal statuses with a case render nothing. Buttons are never permission-gated client-side (per-record actions stay rendered per repo convention; denials surface via toast); coarse `can()` gating applies only to the Add button. All icon buttons carry `title` + `aria-label`; all disable while pending.
- **Confirms**: complete (meeting held?), reject/cancel (with optional reason → saved as a `Note`), reschedule (old → new + notify/restart warning), delete (existing copy). The cancel-confirm button reads "Cancel consultation" so it never duplicates the dismiss "Cancel".
- **Table**: `Scheduled` rows past their booking show a warning "Overdue" badge beside the date (display only; scheduler notifications unchanged).
- **Toasts**: every failure carries title + description (`toastActionError` passthrough); network-level throws use "refresh the page and try again" fallbacks.
- **Modals**: `AddConsultationModal` (status select limited to `Scheduled | Completed`), `EditConsultationModal` (no status control; date/time disabled unless `Scheduled` with inline guidance; read-only banner + linked-case link when accepted-with-case; Save hidden when locked), `CreateCaseFromConsultationModal` (accept flow only; cancel is a plain close), `DecisionModal` (shared; reject/cancel + reason), delete `ConfirmDialog` ("Linked cases are kept (unlinked)").
- **Table/detail**: `StatusBadge` display only; no status select anywhere. Detail shows a `RelatedLinkCard` to the linked case when present.

## 7. Notifications

- Any status change → `ConsultationStatusChanged` to all assignees (actor excluded), gated by the `consultation status changed` setting ([Notifications](./notifications.md), Consultations).
- Booking change on edit → `ConsultationRescheduled` (own `rescheduled` setting) with a "rescheduled" title/message + reminder re-arm ("Re-arm on reschedule").
- Reminders/overdue run on the scheduler (`ConsultationReminder` / `ConsultationOverdue` per assignee prefs); changing the booking resets the timing baseline.

## 8. Data model

`Consultation` (`status`, `booking_datetime`, `client_id`), `ConsultationAssignment`, `Case.source_consultation_id` (nullable, `@unique`, `onDelete: SetNull`), `Note` / `Document` / `Payment` (cascade-deleted with the consultation; files purged from storage). See [Models](./models.md).

## 9. Audit

`consultation.created/updated/status_changed (from → to in details)/accepted/case.created/deleted`. Reject/cancel reasons are saved as consultation `Note`s (`Rejection reason:` / `Cancellation reason:` prefix) in the same transaction as the status flip, so they appear in the Notes tab.

## 10. Resolved questions (changelog)

- **Q1 — Orphan `Accepted` requires two permissions.** Fixed: one atomic `acceptConsultationWithCaseAction` requiring both `consultation.update` (record) and `case.create`; status and case commit in a single transaction.
- **Q2 — Cancel-after-accept cannot revert.** Fixed by removing the premature flip: the modal opens first, cancel changes nothing, and the revert path is deleted.
- **Q3 — Edits never lock.** Fixed: booking changes only while `Scheduled` (server + disabled fields + reschedule confirm); `Accepted`-with-case freezes all fields (read-only banner links the case).
- **Q4 — `createCaseAction` trusts the link.** Fixed: requires an existing `Completed`/`Accepted` source consultation and matching clients (`checkConsultationLink`).
- **Q5 — No decision rationale.** Fixed: optional reason on reject/cancel via the shared `DecisionModal`, stored as a labelled `Note` in-transaction.
- **Q6 — `TERMINAL_CONSULTATION_STATUSES` is dead code.** Fixed: set removed; terminality derives from the matrix via `isTerminalStatus()`.
- **Q7 — Create-as-`Completed`.** Kept intentionally for backfill of already-held meetings; documented in §3.
- **Q8 — `Cancelled` terminality.** Reviewed against real-world flow: cancelling is a scheduling outcome clients routinely reverse, so `Cancelled → Scheduled` (rebook) is allowed with its own button and copy. `Rejected`/`Accepted` stay terminal (decision history / case ownership).
