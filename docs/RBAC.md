# Role-Based Access Control (RBAC)

## Confirmed Roles

Based on the interview transcript, the following roles and permissions were explicitly mentioned:

The system revolved around cases basically.

---

## 1. Super Admin

> "Has full control, including the ability to add or remove users and delete information."

| Permission         | Confirmed    |
| ------------------ | ------------ |
| Add users          | Yes          |
| Edit users         | Yes Probably |
| Remove users       | Yes          |
| Delete information | Yes          |
| Full control       | Yes          |

Need confirmation:

- Super admin can read/write/delete all information(this include users and cases) across all branches?
- Can assign cases to layaws/Paralegal/Process Server?
- What does information means? cases? client info?

## 2. Admin / Branch Manager

> "Similar to the Super Admin but lacks the authority to remove access. They assign cases to lawyers."

| Permission                        | Confirmed         |
| --------------------------------- | ----------------- |
| Similar to Super Admin            | Yes               |
| Cannot remove access              | Yes               |
| Assign cases to lawyers           | Yes               |
| Add/Edit/View cases within branch | Need Confirmation |

Need Confirmation:

- "admin branch manager actually adminapon na sila" (same)
- Role is "similar to Super Admin" but without removal authority?
- What is the difference between super admin and admin/branch manager?

---

## 3. Lawyer

> "Can assign tasks to subordinates (like paralegals or process servers) and edit details related to their assigned cases."

| Permission                     | Confirmed         |
| ------------------------------ | ----------------- |
| Assign tasks to subordinates   | Yes               |
| Edit details of assigned cases | Yes               |
| Create new cases               | Need Confirmation |
| Upload documents               | Need Confirmation |
| View payment status            | Need Confirmation |

Need Confirmation:

- Can read/write/delete cases assigned to them?
- Can read all cases in thier branch? or not?
- Only write/read access to the case they are assign in?

---

## 4. Paralegal / Process Server

> "Can add notes, memos, and deadlines to tasks assigned to them and mark tasks as pending or completed."

| Permission                      | Confirmed         |
| ------------------------------- | ----------------- |
| Add notes to assigned tasks     | Yes               |
| Add memos to assigned tasks     | Yes               |
| Add deadlines to assigned tasks | Yes               |
| Mark tasks as pending           | Yes               |
| Mark tasks as completed         | Yes               |
| Upload documents/attachments    | Need Confirmation |
| View cases (vs only tasks)      | Need Confirmation |
| Assign tasks to others          | Need Confirmation |

Need Confirmation:

- Interview unclear if paralegals can assign to process servers.

---

## 5. Client

> "Clients generally do not have a part in this specific legal process tracking system."

| Access           | Confirmed |
| ---------------- | --------- |
| No system access | Yes       |

---

## Information Needing Confirmation

The following details need clarification for the second interview:

### Unclear from Original Interview

- The difference between Super Admin and Admin(Branch Manager)
- The difference between Paralegal and Process Server

### Permissions to Confirm

- Branch Managers: Can they add/edit cases? Delete cases?
- Branch Managers: Can they add users? Edit user roles?
- Lawyers: Can they upload documents?
- Lawyers: Can they create new cases or only manage assigned ones?
- Paralegals: Can they view full case details or only task details?
- Process Servers: Any unique permissions?
- Cross-branch access: Can Branch Managers see other branches?

### Technical Details to Confirm

- Authentication: Google Auth mentioned only?
- Audit logs: Tracking who viewed/edited files?

### Features to Confirm

- Multi-branch support: Confirm 3 branches (Tagum, Katalunan, +1)
- Service types: Notary vs Consultation distinction
- Case statuses: Consultation -> Accepted -> Pre-Filing -> Filing -> Hearing -> Closed
- Payment tracking: First payment, second payment
- Notifications: Email or SMS?
- 3-day reminder rule: Confirm

---

## Reference

- See `interview-transcript.md` for translated version
- See `interview-transicript-orig.md` for original language transcript
