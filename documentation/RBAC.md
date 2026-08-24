# Role-Based Access Control (RBAC)

> The current system implementation will be based on this document.

> This is the initial RBAC draft - all permissions and rules below are subject to change.

## Roles

> **Dev accounts** are temporary and not part of the standard workflow.
> Admins should remove Dev accounts once initial setup is complete.
> Once removed, Dev accounts cannot sign in again unless explicitly re-added.

```
DEV - initial user

ADMIN
  -> BRANCH MANAGER
    -> LAWYER
      -> PARALEGAL
        -> PROCESS SERVER

```

---

## Access Legend

**Access Qualifiers:**

| Code          | Access Level        | Meaning                                                                                                                                |
| ------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **YES**       | Full Access         | Can perform this action anywhere in the organization.                                                                                  |
| **NO**        | No Access           | Cannot perform this action under any circumstances.                                                                                    |
| **ASSIGNED**  | Directly Assigned   | Only if assigned to this specific record (Case, Task, or Consultation) or its parent Case/Consultation.                                |
| **OWN**       | Creator Only        | Only on records created by the user.                                                                                                   |
| **TASK_ONLY** | Task-Level Modifier | With `ASSIGNED`: requires attachment to that specific Task as an assignee **or** reviewer; parent Case assignment alone is not enough. |

**CRUD:**

| Code | Meaning       |
| ---- | ------------- |
| `C`  | Create/Add    |
| `R`  | Read/View     |
| `U`  | Update/Edit   |
| `D`  | Delete/Remove |

---

## Condition Rules

Combined codes in table cells follow these rules:

1. **`ASSIGNED or OWN`** - Act on the item if you are assigned to it **or** if you created it.
2. **`ASSIGNED + TASK_ONLY`** - Act on a task only if it is assigned directly to you (as assignee or reviewer); you cannot act on other tasks in the same parent Case.
3. **`ASSIGNED and OWN`** - Act on an item only if you created it **and** you are currently assigned to the parent Case/Consultation.
4. **`ASSIGNED + TASK_ONLY or OWN`** - The assigned path requires parent Case access and assignment to that specific Task. The OWN path requires no assignment: creating a task grants the creator update rights on it, even if task or parent assignment is later removed.

---

## Note

1. Admins and Branch Managers have unrestricted access across their scope. Lawyers, Paralegals, and Process Servers must be assigned to a Case or Consultation to access its sub-data (Tasks, Notes, Milestones, Attachments).
2. `YES` on Case READ (e.g., Lawyers) means the Case is visible in the case list or table, but its private sub-data (Notes, Financials) is only accessible when assigned.
3. Activity logs are system-generated audit trails. No user, including Admins, can edit or delete log entries.

---

## Global Data Actions

### [User](./models.md#user)

> Role assignment and user provisioning are managed here. Users with CREATE permission are responsible for adding new users.

| Action | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE |  YES  |       NO       |   NO   |    NO     |       NO       |
| UPDATE |  YES  |       NO       |   NO   |    NO     |       NO       |
| READ   |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE |  YES  |       NO       |   NO   |    NO     |       NO       |

---

### Global [Audit Log](./models.md#audit-log)

> System-wide logs for every action across all entities. Strictly **READ-ONLY** (IMMUTABLE).
> For logs scoped to a specific Case or Consultation, see their respective sub-data sections.

| Action | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE |  NO   |       NO       |   NO   |    NO     |       NO       |
| UPDATE |  NO   |       NO       |   NO   |    NO     |       NO       |
| READ   |  YES  |      YES       |   NO   |    NO     |       NO       |
| DELETE |  NO   |       NO       |   NO   |    NO     |       NO       |

---

## Case Entities

### [Case](./models.md#case)

| Action | Admin | Branch Manager |     Lawyer      | Paralegal | Process Server |
| :----- | :---: | :------------: | :-------------: | :-------: | :------------: |
| CREATE |  YES  |      YES       |       YES       |    NO     |       NO       |
| UPDATE |  YES  |      YES       | ASSIGNED or OWN |    NO     |       NO       |
| READ   |  YES  |      YES       |       YES       | ASSIGNED  |    ASSIGNED    |
| DELETE |  YES  |      YES       |       OWN       |    NO     |       NO       |

---

### Sub-Data of Case

#### [Task](./models.md#task)

| Action | Admin | Branch Manager |     Lawyer      |          Paralegal          |    Process Server    |
| :----- | :---: | :------------: | :-------------: | :-------------------------: | :------------------: |
| CREATE |  YES  |      YES       | ASSIGNED or OWN |          ASSIGNED           |          NO          |
| UPDATE |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED + TASK_ONLY or OWN | ASSIGNED + TASK_ONLY |
| READ   |  YES  |      YES       | ASSIGNED or OWN |          ASSIGNED           |       ASSIGNED       |
| DELETE |  YES  |      YES       | ASSIGNED or OWN |      ASSIGNED and OWN       |          NO          |

> **Task attachment rule:** Anyone added to a Task — as an assignee **or** reviewer — who is not already a member of the parent Case is automatically granted read-only Case membership, so `ASSIGNED` is always satisfied for task-attached users. Task access beyond the case is scoped by `TASK_ONLY` (attachment to that specific Task) and the role's qualifier.
>
> **Attachment access delegation:** A Note or Document resolves its access context from its parent. When `task_id` is set, the **Task** matrix governs (with the task-attachment auto-grant above); otherwise the owning Case or Consultation matrix applies. A `Cancelled` task is terminal — its Notes and Documents are write-locked (create/update/delete refused).
>
> **Review workflow:** The task creator is always auto-added as the first reviewer; their task READ/UPDATE/DELETE comes from `OWN`, their review actions (accept/reject) are expressed through task `UPDATE`. Added reviewers are task-attached users; their READ comes from `ASSIGNED` (auto-granted case membership) and their UPDATE is further scoped by `TASK_ONLY`. Review decisions and comments are normal task updates.

#### [Payment](./models.md#payment)

| Action | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE |  YES  |      YES       |   NO   |    NO     |       NO       |
| UPDATE |  YES  |      YES       |   NO   |    NO     |       NO       |
| READ   |  YES  |      YES       |   NO   |    NO     |       NO       |
| DELETE |  YES  |      YES       |   NO   |    NO     |       NO       |

#### [Note](./models.md#note)

| Action | Admin | Branch Manager |     Lawyer      |    Paralegal     |  Process Server  |
| :----- | :---: | :------------: | :-------------: | :--------------: | :--------------: |
| CREATE |  YES  |      YES       | ASSIGNED or OWN |     ASSIGNED     |     ASSIGNED     |
| UPDATE |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED and OWN | ASSIGNED and OWN |
| READ   |  YES  |      YES       | ASSIGNED or OWN |     ASSIGNED     |     ASSIGNED     |
| DELETE |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED and OWN | ASSIGNED and OWN |

#### [Milestone](./models.md#milestone)

| Action | Admin | Branch Manager |     Lawyer      | Paralegal | Process Server |
| :----- | :---: | :------------: | :-------------: | :-------: | :------------: |
| CREATE |  YES  |      YES       | ASSIGNED or OWN |    NO     |       NO       |
| UPDATE |  YES  |      YES       | ASSIGNED or OWN |    NO     |       NO       |
| READ   |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED  |    ASSIGNED    |
| DELETE |  YES  |      YES       | ASSIGNED or OWN |    NO     |       NO       |

#### [Document](./models.md#document)

> No update action available. To replace a record, users must delete the old attachment and add a new one.

| Action | Admin | Branch Manager |     Lawyer      | Paralegal | Process Server |
| :----- | :---: | :------------: | :-------------: | :-------: | :------------: |
| CREATE |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED  |    ASSIGNED    |
| READ   |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED  |    ASSIGNED    |
| DELETE |  YES  |      YES       | ASSIGNED or OWN |    OWN    |      OWN       |

#### [Audit Log](./models.md#audit-log)

> Activity log scoped specifically to this Case.

| Action | Admin | Branch Manager |  Lawyer  | Paralegal | Process Server |
| :----- | :---: | :------------: | :------: | :-------: | :------------: |
| CREATE |  NO   |       NO       |    NO    |    NO     |       NO       |
| UPDATE |  NO   |       NO       |    NO    |    NO     |       NO       |
| READ   |  YES  |      YES       | ASSIGNED | ASSIGNED  |    ASSIGNED    |
| DELETE |  NO   |       NO       |    NO    |    NO     |       NO       |

---

## Consultation Entities

### [Consultation](./models.md#consultation)

| Action | Admin | Branch Manager |     Lawyer      | Paralegal | Process Server |
| :----- | :---: | :------------: | :-------------: | :-------: | :------------: |
| CREATE |  YES  |      YES       |       YES       |    NO     |       NO       |
| UPDATE |  YES  |      YES       | ASSIGNED or OWN |    NO     |       NO       |
| READ   |  YES  |      YES       |       YES       | ASSIGNED  |    ASSIGNED    |
| DELETE |  YES  |      YES       |       OWN       |    NO     |       NO       |

---

### Sub-Data of Consultation

#### [Payment](./models.md#payment)

| Action | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE |  YES  |      YES       |   NO   |    NO     |       NO       |
| UPDATE |  YES  |      YES       |   NO   |    NO     |       NO       |
| READ   |  YES  |      YES       |   NO   |    NO     |       NO       |
| DELETE |  YES  |      YES       |   NO   |    NO     |       NO       |

#### [Note](./models.md#note)

| Action | Admin | Branch Manager |     Lawyer      |    Paralegal     |  Process Server  |
| :----- | :---: | :------------: | :-------------: | :--------------: | :--------------: |
| CREATE |  YES  |      YES       | ASSIGNED or OWN |     ASSIGNED     |     ASSIGNED     |
| UPDATE |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED and OWN | ASSIGNED and OWN |
| READ   |  YES  |      YES       | ASSIGNED or OWN |     ASSIGNED     |     ASSIGNED     |
| DELETE |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED and OWN | ASSIGNED and OWN |

#### [Document](./models.md#document)

| Action | Admin | Branch Manager |     Lawyer      |    Paralegal     |  Process Server  |
| :----- | :---: | :------------: | :-------------: | :--------------: | :--------------: |
| CREATE |  YES  |      YES       | ASSIGNED or OWN |     ASSIGNED     |     ASSIGNED     |
| READ   |  YES  |      YES       | ASSIGNED or OWN |     ASSIGNED     |     ASSIGNED     |
| DELETE |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED and OWN | ASSIGNED and OWN |

#### [Audit Log](./models.md#audit-log)

> Activity log scoped specifically to this Consultation.

| Action | Admin | Branch Manager |     Lawyer      | Paralegal | Process Server |
| :----- | :---: | :------------: | :-------------: | :-------: | :------------: |
| CREATE |  NO   |       NO       |       NO        |    NO     |       NO       |
| UPDATE |  NO   |       NO       |       NO        |    NO     |       NO       |
| READ   |  YES  |      YES       | ASSIGNED or OWN | ASSIGNED  |    ASSIGNED    |
| DELETE |  NO   |       NO       |       NO        |    NO     |       NO       |
