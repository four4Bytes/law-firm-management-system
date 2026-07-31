# Role-Based Access Control (RBAC)

> **Note:** The current system implementation will be based on this document (planned implementation).
> This is the initial RBAC draft (subject to change).

## Roles

> **Dev accounts** are temporary and not part of the standard workflow.
> Admins should remove Dev accounts once initial setup is complete.
> Once removed, Dev accounts cannot sign in again unless explicitly re-added.

```
DEV

ADMIN
  -> BRANCH MANAGER
    -> LAWYER
      -> PARALEGAL
        -> PROCESS SERVER

```

---

## Access Legend

- **YES**: Can perform the action.
- **NO**: Cannot perform the action.
- **ASSIGNED**: Can perform the action **ONLY** on records assigned to them.
- **OWN**: Can perform the action **ONLY** on records created by them.

---

- **C** = CREATE
- **R** = VIEW / READ
- **U** = UPDATE / EDIT
- **D** = DELETE

---

## Data Action Permissions

> **Note on Client Records:** A Client record is created alongside a case or consultation, so it shares the same permissions as the associated case or consultation.

> **Note on Case Sub-Data Gating:** All sub-data permissions (Tasks, Notes, Milestones, Attachments) are strictly gated by Case Assignment:
>
> - If a user is **NOT** assigned to a Case (via `CaseAssignment`), they automatically have **NO access** to any of that Case's sub-data, regardless of the tables below.
> - If a user **IS** assigned to a Case, their actions on sub-data are governed by the tables below.
> - This rule applies only to **Lawyers and below** (see [Roles](#roles) for the hierarchy).

---

### User

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |       NO       |   NO   |    NO     |       NO       |
| UPDATE | YES |  YES  |       NO       |   NO   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |       NO       |   NO   |    NO     |       NO       |

---

### Activity Log

> Logs are created automatically for every action (CRUD) and are strictly **READ-ONLY** (IMMUTABLE).

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |
| UPDATE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |

---

### Case

| Action | Dev | Admin | Branch Manager |  Lawyer  | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :------: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |    NO    |    NO     |       NO       |
| UPDATE | YES |  YES  |      YES       | ASSIGNED |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |   YES    |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |    NO    |    NO     |       NO       |

---

## Sub-Data of Case

> These records exist under a Case.

#### Tasks

> Task assignment is controlled via CREATE and UPDATE actions.

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |  YES   |    YES    |       NO       |
| UPDATE | YES |  YES  |      YES       |  YES   | ASSIGNED  |    ASSIGNED    |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |  YES   |    NO     |       NO       |

#### Payment

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |   NO   |    NO     |       NO       |
| UPDATE | YES |  YES  |      YES       |   NO   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |   NO   |    NO     |       NO       |
| DELETE | YES |  YES  |      YES       |   NO   |    NO     |       NO       |

#### Note

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| UPDATE | YES |  YES  |      YES       |  YES   |    OWN    |      OWN       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |  YES   |    OWN    |      OWN       |

#### Milestone

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |  YES   |    NO     |       NO       |
| UPDATE | YES |  YES  |      YES       |  YES   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |  YES   |    NO     |       NO       |

#### Attachments

> No update action available. To replace a record, users must delete the old attachment and add a new one.

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |  YES   |    OWN    |      OWN       |

#### Activity Log

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |
| UPDATE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |

---

### Consultation

| Action | Dev | Admin | Branch Manager |  Lawyer  | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :------: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |    NO    |    NO     |       NO       |
| UPDATE | YES |  YES  |      YES       | ASSIGNED |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |   YES    |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |    NO    |    NO     |       NO       |

---

## Sub-Data of Consultation

> These records exist under a Consultation.

#### Payment

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |   NO   |    NO     |       NO       |
| UPDATE | YES |  YES  |      YES       |   NO   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |   NO   |    NO     |       NO       |
| DELETE | YES |  YES  |      YES       |   NO   |    NO     |       NO       |

#### Note

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| UPDATE | YES |  YES  |      YES       |  YES   |    OWN    |      OWN       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |  YES   |    OWN    |      OWN       |

#### Attachments

> No update action available. To replace a record, users must delete the old attachment and add a new one.

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |      YES       |  YES   |    OWN    |      OWN       |

#### Activity Log

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |
| UPDATE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | NO  |  NO   |       NO       |   NO   |    NO     |       NO       |
