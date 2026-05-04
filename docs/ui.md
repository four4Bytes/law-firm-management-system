## Clients Page

- Table of Clients
  - Columns: Name, Contact, Branch, Services Availed, Active Cases.
  - Each row = one client.
  - Clicking a client → shows their services history (notary, consultations, cases).
- Purpose: intake + overview of all clients across branches.

---

## Services Page

- Notary Page
  - Table of notary records only.
  - Columns: Document Type, Client, Date, Status, Payment.
  - Quick filters: by branch, by lawyer, by date.

- Consultation Page
  - Table of consultations only.
  - Columns: Client, Lawyer, Date, Status (Accepted / Not Accepted).
  - If “Accepted” → links to a Case record.

---

## Cases Page

- Case List Table
  - Columns: Case Title, Client, Status, Assigned Lawyer, Branch.
  - Filters: by status (Consultation, Pre-Filing, Hearing, Closed).
- Case Detail View (Main Container)
  ```
  CASE (Main Container)
  ├── Tasks (multiple per case)
  ├── Payments (first payment, second payment, partials)
  ├── Notes/Memos (internal instructions)
  ├── Documents/Uploads (pleadings, evidence, affidavits)
  ├── Deadlines/Due Dates (court dates, filing deadlines)
  ├── Status (Consultation -> Accepted -> Pre-Filing -> Filing -> Hearing -> Closed)
  └── Assigned Staff (lawyer, paralegal, process server)
  ```
- Purpose: the hub for everything tied to a case.

---

## Tasks Page

- Table of tasks across all cases.
- Columns: Task Description, Case, Assigned To, Status, Due Date.
- Clicking a task → opens detail (notes, documents, deadlines).

---

## Documents Page

- Table of all uploaded documents.
- Columns: File Name, Case, Task, Uploaded By, Date.
- Filters: by case, by type (pleading, evidence, affidavit).

---

## Payments Page

- Table of payments across cases.
- Columns: Client, Case, Amount, Type (first, second, partial), Status (unpaid, partial, paid), Date.
- Clicking → shows payment history per client/case.

---

## Reports Page

- Prebuilt summaries:
  - Pending cases by branch.
  - Overdue deadlines.
  - Paid vs. unpaid clients.
  - Notary services count.
- Export options (PDF/Excel).

---

## How It All Connects

- Clients = intake.
- Services = notary + consultation records.
- Cases = deeper workflows (tasks, payments, docs, deadlines, staff).
- Tasks, Documents, Payments = can be accessed globally or inside a case.
- Reports = analytics across everything.
