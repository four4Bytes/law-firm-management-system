# Law Firm Management System — Documentation

## Quick links

| Document                                            | What it covers                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Getting Started](./getting-started.md)             | Prerequisites, environment setup, running the dev server                          |
| [Architecture](./architecture.md)                   | Tech stack, directory layout, data flow, conventions                              |
| [Models](./models.md)                               | Data entities, fields, and enums                                                  |
| [Security](./security.md)                           | AuthN/AuthZ, input validation, action security, file upload safety, audit logging |
| [Deployment](./deployment.md)                       | Release process, Docker, Vercel, storage encryption, reminders                    |
| [RBAC](./RBAC.md)                                   | Role Based Access Control (canonical)                                             |
| [Notifications](./notifications.md)                 | Notification & reminder pipelines (canonical)                                     |
| [Lifecycle](./lifecycle.md)                         | Status transitions and the only field locks in the system (canonical)             |
| [Case workflow](./case-workflow.md)                 | Case status matrix, closing flow, reopen                                          |
| [Consultation workflow](./consultation-workflow.md) | Consultation status matrix, accept-to-case handoff, rescheduling                  |
| [Task review workflow](./task-review-workflow.md)   | Task derivation, review chain, reopen                                             |
| [Open questions](./open-questions.md)               | Unvalidated product decisions to confirm with the client                          |
| [Testing](./testing.md)                             | Test conventions, fixtures, and helpers (see also `AGENTS.md` §12)                |
| [Seeding](./seeding.md)                             | Seed scenarios: which rows demonstrate what                                       |

For a quickstart, see [Getting Started](./getting-started.md).
