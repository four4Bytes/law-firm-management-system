# Case Workflow — Specification

## 1. Overview

A case moves `Open → Closed/Settled/Terminated`, and any concluded case can be reopened back to `Open`. Status changes go through one server action (`changeCaseStatusAction`) driven by header icon buttons — never a dropdown. `Open` covers the whole live matter (intake through active work); there is deliberately no separate "ongoing" state. Field edits never touch status, and creation always starts at `Open`.

## 2. Roles

No workflow-specific roles. `case.update` on the record (assigned or managerial scope) edits fields and changes status; the closing reason note inherits that gate, which is equal-or-stricter than `note.create` for every role (see [RBAC](./RBAC.md), Case Entities).

## 3. Statuses

| Value        | Meaning (see [Models](./models.md), Case Status)                 |
| ------------ | ---------------------------------------------------------------- |
| `Open`       | Matter is live (intake through active work)                      |
| `Closed`     | Concluded by decision or completion (judgment, matter fulfilled) |
| `Settled`    | Concluded by compromise (settlement / compromise agreement)      |
| `Terminated` | Ended without resolution (withdrawn, dismissed, disengaged)      |

The three endings are siblings distinguished by exit paperwork — that is what keeps them from meaning the same thing.

### Transition matrix (single source of truth: `CASE_STATUS_TRANSITIONS` in `src/features/cases/status.ts`)

| From         | To                                |
| ------------ | --------------------------------- |
| `Open`       | `Closed`, `Settled`, `Terminated` |
| `Closed`     | `Open` (reopen)                   |
| `Settled`    | `Open` (reopen)                   |
| `Terminated` | `Open` (reopen)                   |

Terminality (`isTerminalCaseStatus`) means "no outcome change", not "frozen forever": resumed litigation (reconsideration granted, remanded on appeal, settlement breached, dormant matter reactivated) stays on the same matter record — same court, docket, client, fees, documents — instead of fragmenting across two records. Every reopen is an explicit, confirmed, audited transition. Same-status transitions are rejected.

```
New case (always Open)
         │
         ▼
   ┌──────────┐  close / settle / terminate   ┌──────────────────────────────┐
   │   Open   │ ─────────────────────────────→ │ Closed / Settled / Terminated │
   └──────────┘                                └──────────────┬───────────────┘
          ▲                                                  │ reopen (guarded)
          └──────────────────────────────────────────────────┘
```

### Rules

- **Create** (`CaseCreatePayloadSchema` / WithClient variant): status is accepted but the UI always submits `Open`. There is no status select on creation.
- **Edit** (`CaseUpdatePayloadSchema` / `CaseDataSchema` update variant): carries **no status field**. Field edits can never change status.
- **Status change** (`CaseStatusChangePayloadSchema`): accepts any enum value plus an optional `reason`; legality is enforced server-side by `isValidCaseStatusTransition()`. Illegal moves return `conflict / Invalid status change` naming the legal next steps (`describeCaseNextSteps()`).
- **Append-only lock**: on `Closed`/`Settled`/`Terminated`, existing notes/files refuse update/delete (`RecordLockedError` → `locked` envelope); creation, reads, and payments stay open. Reopening restores editing. See [Lifecycle](./lifecycle.md).

## 4. Server actions (`src/features/cases/actions.ts`)

| Action                                            | Guard order                                                                    | Success side effects (`after`)                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `createCaseAction` / `createCaseWithClientAction` | auth → Zod → `case.create` permission → consultation-link check (when linked)  | audit `case.created`; `CaseAssigned` to assignees                                                                                      |
| `updateCaseAction` / `updateCaseWithClientAction` | auth → Zod → not-found → `case.update` permission                              | audit `case.updated`; `CaseAssigned` to newly added assignees                                                                          |
| `changeCaseStatusAction`                          | auth → Zod → not-found → `case.update` permission (throwing) → transition gate | audit `case.status_changed` (`from → to`); `CaseStatusChanged` to assignees; reason (if any) saved as a `Note` in the same transaction |
| `deleteCaseAction`                                | auth → Zod → not-found → `case.delete` permission                              | audit `case.deleted`; documents purged; `P2025` maps to not-found                                                                      |

Guards use the throwing helpers inside the `try` block; `toActionResponse` maps `ForbiddenError`/`UnauthorizedError` to the standard envelopes. A linked consultation (`source_consultation_id`) must exist, be `Completed`/`Accepted`, and share the case's client (`checkConsultationLink`).

## 5. Closing flow

`CaseDetail` routes terminal targets to the shared `DecisionModal` (description names which ending applies + optional reason → `Closing reason:` / `Settlement reason:` / `Termination reason:` note). Reopening routes to a confirm dialog ("reopens a concluded matter — history stays intact — only if litigation genuinely resumed"). Reasons are consultation-workflow-style labelled notes on `case_id`, visible in the case Notes tab.

## 6. UI

- **Workflow buttons** (`CaseWorkflowActions`): ghost icon buttons from the matrix — gavel (close), handshake (settle), ban (terminate), rotate (reopen). Empty states render `null`. Never permission-gated client-side; denials surface via toast. `title` + `aria-label`; disabled while pending.
- **Modals**: `AddCaseModal` and `CreateCaseFromConsultationModal` have no status select (always `Open`); `EditCaseModal` has no status control; shared `DecisionModal` per outcome + reopen `ConfirmDialog`; delete `ConfirmDialog` (existing copy).
- **Table/detail**: `StatusBadge` display only (`Open` info, `Closed` done, `Settled` info, `Terminated` danger); no status select anywhere.

## 7. Notifications

Any status change → `CaseStatusChanged` to all assignees (actor excluded), gated by the `case status changed` setting ([Notifications](./notifications.md)).

## 8. Data model

`Case` (`status`, `source_consultation_id` nullable `@unique`, `onDelete: SetNull` from `Consultation`), `CaseAssignment`, `Note` / `Document` / `Payment` / `Task` / `CaseMilestone` (cascade-deleted with the case; files purged). See [Models](./models.md).

## 9. Audit

`case.created/updated/status_changed (from → to in details)/deleted`. Closing reasons live as labelled notes, not in audit details.

## 10. Resolved questions

- **Why no `Ongoing`?** `Open` vs "ongoing" has no crisp real-world event separating them (unlike meeting-held), so the distinction would be applied inconsistently and the data would lie. `Open` honestly covers intake-through-active-work. (An `Ongoing` value briefly existed in the schema during development and was reverted before any rows used it.)
- **Why is reopen allowed but consultation terminal states aren't?** A rejected consultation is a declined opportunity (new record is clean); a case accumulates fees/documents/notes whose continuity matters across resumed litigation. Both directions are audited appends, never rewrites.
- **Why is creation always `Open`?** The UI offers no select; backfilled files reach their true state through the guarded transitions, keeping one writer for all status changes.
