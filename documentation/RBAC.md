# RBAC

> This the initial RBAC (not final)

## Roles

```
DEV - Initial user to bootstrap and to test the functionality of the app.

ADMIN
  -> BRANCH MANAGER
    -> LAWYER
      -> PARALEGAL
        -> PROCESS SERVER

```

## Access Legend

- YES: Can perform the action
- NO: Cannot perform the action.
- ASSIGNED: Can perform the action ONLY on records assigned to them.
- OWN: Can access records created by them.

---

- C = CREATE
- R = VIEW/READ
- U = UPDATE/EDIT
- D = DELETE

## Data Action Permissions

> Client record is created along side with case/consultation
> creation so they shared the same permission as case/consultation.

> All sub-data permissions (Tasks, Notes, Milestones, Attachments) are gated by Case Assignment.
>
> - If a user is NOT assigned to a Case (via `CaseAssignment`), they automatically have NO access to any of that Case's sub-data, regardless of the tables below.
> - If a user IS assigned to a Case, their actions on sub-data are governed by the tables below.
> - This rule only applies to Lawyer and below. see [Roles](##Roles) for the Hierarchy

### User

| Action | Dev | Admin | Branch Manager | Lawyer | Paralegal | Process Server |
| :----- | :-: | :---: | :------------: | :----: | :-------: | :------------: |
| CREATE | YES |  YES  |       NO       |   NO   |    NO     |       NO       |
| UPDATE | YES |  YES  |       NO       |   NO   |    NO     |       NO       |
| READ   | YES |  YES  |      YES       |  YES   |    YES    |      YES       |
| DELETE | YES |  YES  |       NO       |   NO   |    NO     |       NO       |

### Activity Log

> Log is created on every action(CRUD), it is strictly READ only (IMMUTABLE).

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

## Sub data of Case

> These data/records are under the case.

#### Tasks

> Task assignment is controlled by UPDATE/CREATE.

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

> No update, to update users must delete the old record and add the new one.

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

## Sub data of Consultation

> These data/records are under the consultation.

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

> No update, to update users must delete the old record and add the new one.

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
