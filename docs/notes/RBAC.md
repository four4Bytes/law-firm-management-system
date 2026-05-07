### 1. User Management

| Role                   | Create | Read | Update | Delete |
| :--------------------- | :----- | :--- | :----- | :----- |
| Super Admin            | Yes    | Yes  | Yes    | Yes    |
| Admin (Branch Manager) | Yes    | Yes  | Yes    | No     |
| Lawyer                 | No     | Yes  | Yes    | No     |
| Paralegal              | No     | Yes  | No     | No     |
| Process Server         | No     | Yes  | No     | No     |

---

### 2. Notary Services

| Role                   | Create | Read | Update | Delete |
| :--------------------- | :----- | :--- | :----- | :----- |
| Super Admin            | Yes    | Yes  | Yes    | Yes    |
| Admin (Branch Manager) | Yes    | Yes  | Yes    | Yes    |
| Lawyer                 | Yes    | Yes  | Yes    | Yes    |
| Paralegal              | No     | Yes  | No     | No     |
| Process Server         | No     | Yes  | No     | No     |

---

### 3. Consultation Services

| Role                   | Create | Read | Update | Delete |
| :--------------------- | :----- | :--- | :----- | :----- |
| Super Admin            | Yes    | Yes  | Yes    | Yes    |
| Admin (Branch Manager) | Yes    | Yes  | Yes    | Yes    |
| Lawyer                 | Yes    | Yes  | Yes    | yes    |
| Paralegal              | No     | Yes  | No     | No     |
| Process Server         | No     | Yes  | No     | No     |

---

### 4. Cases

| Role                   | Create | Read | Update                  | Delete |
| :--------------------- | :----- | :--- | :---------------------- | :----- |
| Super Admin            | Yes    | Yes  | Yes                     | Yes    |
| Admin (Branch Manager) | Yes    | Yes  | Yes                     | No     |
| Lawyer                 | Yes    | Yes  | Yes                     | No     |
| Paralegal              | No     | Yes  | Yes (Notes/Memos/Files) | No     |
| Process Server         | No     | Yes  | Yes (Notes/Memos/Files) | No     |

#### Task-Specific Access

- Create: Admins and Lawyers are the primary roles for creating and assigning tasks to paralegals and process servers. Paralegals may also assign specific tasks to process servers.
- Read: All roles can see task descriptions (words) and file attachments linked to the case.
- Update: Paralegals and Process Servers update tasks by adding notes, memos, or deadlines and marking status as "pending," "ongoing," or "completed".
- Payment Log: All roles have read access to the payment log (client info and payment tasks), which tracks cash amounts and times. Only Admins and Lawyers typically update these status stages.
