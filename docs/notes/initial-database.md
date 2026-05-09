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

| Field      | Type       | Notes          |
| ---------- | ---------- | -------------- |
| id         | uuid / int | Primary key    |
| name       | text       | Required       |
| address    | text       | Optional       |
| email      | text       | Optional       |
| created_at | timestamp  | Auto-generated |
| updated_at | timestamp  | Auto-updated   |

---

## 3) Consultations

| Field              | Type             | Notes                                               |
| ------------------ | ---------------- | --------------------------------------------------- |
| id                 | uuid / int       | Primary key                                         |
| client_id          | fk -> clients.id | Required                                            |
| booking_datetime   | timestamp        | Required                                            |
| purpose            | text             | Required                                            |
| concern            | text             | Legal concern of the client                         |
| advice             | text             | Attorney’s advice or opinion                        |
| status             | enum             | scheduled, completed, accepted, rejected, cancelled |
| accepted_case_id   | fk -> cases.id   | Nullable; used if consultation becomes a case       |
| created_by_user_id | fk -> users.id   | Required                                            |
| created_at         | timestamp        | Auto-generated                                      |
| updated_at         | timestamp        | Auto-updated                                        |

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

| Field              | Type             | Notes                                      |
| ------------------ | ---------------- | ------------------------------------------ |
| id                 | uuid / int       | Primary key                                |
| client_id          | fk -> clients.id | Required                                   |
| case_title         | text             | Required                                   |
| case_type          | text             | Required                                   |
| parties_involved   | text             | May later be structured                    |
| stage              | text / enum      | Example: pre-filing, filing, hearing, etc. |
| status             | enum             | open, ongoing, closed, terminated, settled |
| assigned_lawyer_id | fk -> users.id   | Nullable                                   |
| created_by_user_id | fk -> users.id   | Required                                   |
| created_at         | timestamp        | Auto-generated                             |
| updated_at         | timestamp        | Auto-updated                               |

---

## 6) Tasks

| Field               | Type           | Notes                                  |
| ------------------- | -------------- | -------------------------------------- |
| id                  | uuid / int     | Primary key                            |
| case_id             | fk -> cases.id | Required                               |
| title               | text           | Required                               |
| description         | text           | Optional                               |
| status              | enum           | pending, ongoing, completed, cancelled |
| due_datetime        | timestamp      | Optional                               |
| created_by_user_id  | fk -> users.id | Required                               |
| assigned_to_user_id | fk -> users.id | Nullable                               |
| created_at          | timestamp      | Auto-generated                         |
| updated_at          | timestamp      | Auto-updated                           |

---

## 7) Payments

| Field              | Type           | Notes                           |
| ------------------ | -------------- | ------------------------------- |
| id                 | uuid / int     | Primary key                     |
| service_type       | enum           | notary, consultation, case      |
| service_id         | uuid / int     | Related service record          |
| amount             | decimal        | Required                        |
| payment_date       | timestamp      | Required                        |
| status             | enum           | unpaid, partial, paid, refunded |
| payment_method     | text           | Optional                        |
| receipt_number     | text           | Optional                        |
| created_by_user_id | fk -> users.id | Required                        |
| created_at         | timestamp      | Auto-generated                  |
| updated_at         | timestamp      | Auto-updated                    |

---

## 8) Documents

| Field               | Type           | Notes                            |
| ------------------- | -------------- | -------------------------------- |
| id                  | uuid / int     | Primary key                      |
| file_name           | text           | Required                         |
| file_path           | text           | Required                         |
| file_type           | text           | Example: pdf, jpg, png           |
| file_size           | int            | Optional                         |
| related_type        | enum           | case, consultation, notary, task |
| related_id          | uuid / int     | Related record ID                |
| uploaded_by_user_id | fk -> users.id | Required                         |
| created_at          | timestamp      | Auto-generated                   |
| updated_at          | timestamp      | Auto-updated                     |

---

## 9) Notes / Memos

| Field              | Type           | Notes                            |
| ------------------ | -------------- | -------------------------------- |
| id                 | uuid / int     | Primary key                      |
| content            | text           | Required                         |
| related_type       | enum           | case, consultation, notary, task |
| related_id         | uuid / int     | Related record ID                |
| created_by_user_id | fk -> users.id | Required                         |
| is_private         | boolean        | Default: false                   |
| created_at         | timestamp      | Auto-generated                   |
| updated_at         | timestamp      | Auto-updated                     |

---

## 10) Optional: Audit Logs

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

### Payment Status

- unpaid
- partial
- paid
- refunded
