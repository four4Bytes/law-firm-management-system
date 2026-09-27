# Seeding Guide

`pnpm prisma:seed` wipes and rebuilds the dev database (`prisma/seed/`). The seed is designed as a
simulatable firm: every status, role, and notification path has a living example. This doc maps scenarios
to the seeded rows that demonstrate them.

## Presence (online dots)

`last_seen_at` is relative to seed time, so the demo never rots:

| Who                                     | State                     |
| --------------------------------------- | ------------------------- |
| Dev Admin, Maria, Miguel, Jessica, Maya | Online (seen < 2 min ago) |
| Marco, Kevin, Gina, Liza                | Recently offline          |
| Everyone else                           | Stale / long offline      |
| Paolo Guerrero                          | Never seen (`null`)       |

## Notification preferences

Most users keep defaults (all on). Exceptions:

| User           | Setup                                                     |
| -------------- | --------------------------------------------------------- |
| Maya Fernandez | All email + overdue toggles **off** — receives nothing    |
| Paolo Guerrero | Task toggles off, Daily milestone frequency, 2-day window |
| Jessica Lim    | 1-day consultation reminder window                        |
| Benito Cruz    | Daily frequencies                                         |

Assign Maya to something and trigger an event to watch the preference gate swallow it.

## Reminder cron scenarios

These rows are eligible on the next scheduler run:

- **Overdue milestones** (Pending, past due, unclaimed): "BIR Tax Clearance Submission",
  "Parenting Plan Mediation", plus two older ones.
- **Overdue consultation** (Scheduled, booking passed): Jose Mercado's small-claims consult.
- **Due-soon items**: milestones 2–7 days out and Scheduled consultations within each assignee's
  personal window (Jessica's 1-day window vs the default 3 makes the per-user logic visible).

## Lifecycle coverage

| Status                                | Example                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| Case `Settled`                        | Aquino Illegal Dismissal (with `Settlement reason:` note)                           |
| Case `Terminated`                     | Torres Ejectment — Withdrawn (with `Termination reason:` note, refunded filing fee) |
| Case `Closed`                         | Navarro JV, Villanueva Corp Registration                                            |
| Consultation `Rejected` / `Cancelled` | Seeded alongside Scheduled/Completed/Accepted                                       |
| Task `Done` / `InReview`              | Aquino and Torres tasks (fully approved review chains)                              |
| Milestone `Cancelled`                 | Torres pre-trial (moot after withdrawal)                                            |
| Payment `Refunded`                    | Torres filing fee                                                                   |

Terminal records stay fully editable at runtime, but the seed writes history directly — the seeded
`Settlement reason:` / `Termination reason:` notes mirror exactly what `DecisionModal` saves.

## Documents

All 50 `Document` rows have real bytes in MinIO under parent-scoped keys
(`cases/{id}/{file}`, `tasks/…`, `consultations/…`), so list, download, and delete flows work on a
fresh seed. Content is placeholder text — replace with real files to demo further.
