# Initial Database Schema

## 1) Users

| Field      | Type       | Notes                                                 |
| ---------- | ---------- | ----------------------------------------------------- |
| id         | uuid / int | Primary key                                           |
| name       | text       | Required                                              |
| email      | text       | Required, unique                                      |
| google_sub | text       | Google account identifier, unique                     |
| role       | enum       | super_admin, admin, lawyer, paralegal, process_server |
| is_active  | boolean    | Default: true                                         |
| created_at | timestamp  | Auto-generated                                        |
| updated_at | timestamp  | Auto-updated                                          |

---

## 2) Clients

| Field        | Type       | Notes          |
| ------------ | ---------- | -------------- |
| id           | uuid / int | Primary key    |
| name         | text       | Required       |
| address      | text       | Optional       |
| email        | text       | Optional       |
| phone_number | text       | Optional       |
| created_at   | timestamp  | Auto-generated |
| updated_at   | timestamp  | Auto-updated   |

---

## 3) Consultations

| Field              | Type             | Notes                                               |
| ------------------ | ---------------- | --------------------------------------------------- |
| id                 | uuid / int       | Primary key                                         |
| client_id          | fk -> clients.id | Required                                            |
| booking_datetime   | timestamp        | Required                                            |
| concern            | text             | Required                                            |
| status             | enum             | scheduled, completed, accepted, rejected, cancelled |
| created_by_user_id | fk -> users.id   | Required                                            |
| created_at         | timestamp        | Auto-generated                                      |
| updated_at         | timestamp        | Auto-updated                                        |

Notes:

- A consultation does not store a case reference.
- If a consultation becomes a case, the case stores `source_consultation_id`.

---

## 4) Notary Services

| Field              | Type             | Notes                                |
| ------------------ | ---------------- | ------------------------------------ |
| id                 | uuid / int       | Primary key                          |
| client_id          | fk -> clients.id | Nullable                             |
| name               | text             | Client name snapshot or service name |
| address            | text             | Client address snapshot              |
| description_type   | text             | Document or service description      |
| scheduled_datetime | timestamp        | Required                             |
| created_by_user_id | fk -> users.id   | Required                             |
| created_at         | timestamp        | Auto-generated                       |
| updated_at         | timestamp        | Auto-updated                         |

---

## 5) Cases

| Field                  | Type                   | Notes                                                      |
| ---------------------- | ---------------------- | ---------------------------------------------------------- |
| id                     | uuid / int             | Primary key                                                |
| client_id              | fk -> clients.id       | Required                                                   |
| source_consultation_id | fk -> consultations.id | Nullable; used if the case was created from a consultation |
| case_title             | text                   | Required                                                   |
| case_type              | text                   | Required                                                   |
| parties_involved       | text (optional)        | May later be structured                                    |
| status                 | enum                   | open, ongoing, closed, terminated, settled                 |
| created_by_user_id     | fk -> users.id         | Required                                                   |
| created_at             | timestamp              | Auto-generated                                             |
| updated_at             | timestamp              | Auto-updated                                               |

Notes:

- A case may be created directly without a consultation.
- If the case originates from a consultation, `source_consultation_id` should be set.
- If created directly, `source_consultation_id` should be `NULL`.

---

## 6) Case Assignments

| Field      | Type           | Notes          |
| ---------- | -------------- | -------------- |
| id         | uuid / int     | Primary key    |
| case_id    | fk -> cases.id | Required       |
| user_id    | fk -> users.id | Required       |
| created_at | timestamp      | Auto-generated |
| updated_at | timestamp      | Auto-updated   |

Notes:

- A case can have multiple assigned users.
- A user can be assigned to multiple cases.

---

## 7) Task Assignments

| Field      | Type           | Notes          |
| ---------- | -------------- | -------------- |
| id         | uuid / int     | Primary key    |
| task_id    | fk -> tasks.id | Required       |
| user_id    | fk -> users.id | Required       |
| created_at | timestamp      | Auto-generated |
| updated_at | timestamp      | Auto-updated   |

Notes:

- A task can have multiple assigned users.
- A user can be assigned to multiple tasks.

---

## 8) Tasks

| Field              | Type           | Notes                                  |
| ------------------ | -------------- | -------------------------------------- |
| id                 | uuid / int     | Primary key                            |
| case_id            | fk -> cases.id | Required                               |
| title              | text           | Required                               |
| description        | text           | Optional                               |
| status             | enum           | pending, ongoing, completed, cancelled |
| created_by_user_id | fk -> users.id | Required                               |
| created_at         | timestamp      | Auto-generated                         |
| updated_at         | timestamp      | Auto-updated                           |

Notes:

- Tasks do not have deadlines.
- Use `case_milestones` for dated case-level items.

---

## 9) Case Milestones

| Field              | Type             | Notes                    |
| ------------------ | ---------------- | ------------------------ |
| id                 | uuid / int       | Primary key              |
| case_id            | fk -> cases.id   | Required                 |
| title              | text             | Required                 |
| description        | text             | Optional                 |
| due_date           | date / timestamp | Required                 |
| status             | enum             | pending, done, cancelled |
| created_by_user_id | fk -> users.id   | Required                 |
| created_at         | timestamp        | Auto-generated           |
| updated_at         | timestamp        | Auto-updated             |

Notes:

- Milestones are case-level only.
- Titles should be flexible and not hardcoded.
- `overdue` is derived in application logic when `status = pending` and `due_date < now()`.

---

## 10) Milestone Notifications

| Field        | Type                     | Notes                          |
| ------------ | ------------------------ | ------------------------------ |
| id           | uuid / int               | Primary key                    |
| milestone_id | fk -> case_milestones.id | Required                       |
| user_id      | fk -> users.id           | Required; assigned case member |
| is_read      | boolean                  | Default: false                 |
| notified_at  | timestamp                | Auto-generated                 |
| created_at   | timestamp                | Auto-generated                 |
| updated_at   | timestamp                | Auto-updated                   |

Notes:

- Only users assigned to the related case should receive milestone notifications.
- This is not a general notification system; it is case milestone-specific.

---

## 11) Payments

| Field              | Type                     | Notes                           |
| ------------------ | ------------------------ | ------------------------------- |
| id                 | uuid / int               | Primary key                     |
| amount             | decimal                  | Required                        |
| payment_date       | timestamp                | Required                        |
| status             | enum                     | unpaid, partial, paid, refunded |
| payment_method     | text                     | Optional                        |
| receipt_number     | text                     | Optional                        |
| case_id            | fk -> cases.id           | Nullable                        |
| consultation_id    | fk -> consultations.id   | Nullable                        |
| notary_service_id  | fk -> notary_services.id | Nullable                        |
| created_by_user_id | fk -> users.id           | Required                        |
| created_at         | timestamp                | Auto-generated                  |
| updated_at         | timestamp                | Auto-updated                    |

Notes:

- Exactly one of `case_id`, `consultation_id`, or `notary_service_id` must be non-null.
- Use a database `CHECK` constraint to enforce this.
- This replaces polymorphic `service_type` / `service_id`.

---

## 12) Documents

| Field               | Type                     | Notes                  |
| ------------------- | ------------------------ | ---------------------- |
| id                  | uuid / int               | Primary key            |
| file_name           | text                     | Required               |
| file_path           | text                     | Required               |
| file_type           | text                     | Example: pdf, jpg, png |
| file_size           | int                      | Optional               |
| case_id             | fk -> cases.id           | Nullable               |
| consultation_id     | fk -> consultations.id   | Nullable               |
| notary_service_id   | fk -> notary_services.id | Nullable               |
| task_id             | fk -> tasks.id           | Nullable               |
| uploaded_by_user_id | fk -> users.id           | Required               |
| created_at          | timestamp                | Auto-generated         |
| updated_at          | timestamp                | Auto-updated           |

Notes:

- Exactly one of `case_id`, `consultation_id`, `notary_service_id`, or `task_id` must be non-null.
- Use a database `CHECK` constraint to enforce this.
- This replaces polymorphic `related_type` / `related_id`.

---

## 13) Notes / Memos

| Field              | Type                     | Notes          |
| ------------------ | ------------------------ | -------------- |
| id                 | uuid / int               | Primary key    |
| content            | text                     | Required       |
| case_id            | fk -> cases.id           | Nullable       |
| consultation_id    | fk -> consultations.id   | Nullable       |
| notary_service_id  | fk -> notary_services.id | Nullable       |
| task_id            | fk -> tasks.id           | Nullable       |
| created_by_user_id | fk -> users.id           | Required       |
| is_private         | boolean                  | Default: false |
| created_at         | timestamp                | Auto-generated |
| updated_at         | timestamp                | Auto-updated   |

Notes:

- Exactly one of `case_id`, `consultation_id`, `notary_service_id`, or `task_id` must be non-null.
- Use a database `CHECK` constraint to enforce this.
- This replaces polymorphic `related_type` / `related_id`.

---

## 14) Optional: Audit Logs

| Field         | Type           | Notes                           |
| ------------- | -------------- | ------------------------------- |
| id            | uuid / int     | Primary key                     |
| actor_user_id | fk -> users.id | User who performed the action   |
| action        | text           | Example: create, update, delete |
| entity_type   | text           | Example: case, task, document   |
| entity_id     | uuid / int     | Target record                   |
| details       | json / text    | Optional metadata               |
| created_at    | timestamp      | Auto-generated                  |

---

## Suggested Enums

### Role

- super_admin
- admin
- lawyer
- paralegal
- process_server

### Consultation Status

- scheduled
- completed
- accepted
- rejected
- cancelled

### Case Status

- open
- ongoing
- closed
- terminated
- settled

### Task Status

- pending
- ongoing
- completed
- cancelled

### Case Milestone Status

- pending
- done
- cancelled

### Payment Status

- unpaid
- partial
- paid
- refunded
