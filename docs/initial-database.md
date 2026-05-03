# Initial Database Design (not final)

## Database Schema (Proposed)

### 1. Clients

- `client_id` (PK)
- `full_name`
- `contact_number`
- `email`
- `address`
- `government_id_type`
- `government_id_number`
- `branch_id` (FK → Branches)

---

### 2. Branches

- `branch_id` (PK)
- `branch_name` (Tagum, Katalunan, etc.)
- `location`
- `manager_id` (FK → Users)

---

### 3. Users

- `user_id` (PK)
- `name`
- `email`
- `role` (Super Admin, Branch Manager, Lawyer, Paralegal, Process Server)
- `branch_id` (FK → Branches)
- `status` (active/inactive)

---

### 4. Services

- `service_id` (PK)
- `client_id` (FK → Clients)
- `service_type` (Notary, Consultation)
- `date_requested`
- `status` (Completed, Accepted, Not Accepted)
- `assigned_lawyer_id` (FK → Users)

---

### 5. Cases

- `case_id` (PK)
- `client_id` (FK → Clients)
- `branch_id` (FK → Branches)
- `assigned_lawyer_id` (FK → Users)
- `status` (Consultation, Accepted, Pre-Filing, Filing, Hearing, Closed, Terminated)
- `case_title`
- `case_type` (civil, criminal, special procedure)
- `court_info`
- `created_at`

---

### 6. Tasks

- `task_id` (PK)
- `case_id` (FK → Cases)
- `assigned_to` (FK → Users)
- `description`
- `status` (Pending, Completed, Ongoing, Cancelled)
- `due_date`
- `created_by` (FK → Users)

---

### 7. Notes / Memos

- `note_id` (PK)
- `case_id` (FK → Cases)
- `task_id` (FK → Tasks, nullable)
- `author_id` (FK → Users)
- `content`
- `created_at`

---

### 8. Documents

- `document_id` (PK)
- `case_id` (FK → Cases)
- `task_id` (FK → Tasks, nullable)
- `uploaded_by` (FK → Users)
- `file_path` (S3, Wasabi, or local storage)
- `description`
- `upload_date`

---

### 9. Payments

- `payment_id` (PK)
- `case_id` (FK → Cases)
- `client_id` (FK → Clients)
- `amount`
- `payment_type` (first, second, partial, full)
- `status` (unpaid, partial, fully paid)
- `date_paid`
- `recorded_by` (FK → Users)

---

### 10. Notifications

- `notification_id` (PK)
- `case_id` (FK → Cases)
- `recipient_id` (FK → Users)
- `type` (deadline reminder, task assignment, payment recorded, case status change, document upload)
- `channel` (email, SMS, in-app)
- `message`
- `sent_at`

---

### 11. Audit Logs

- `log_id` (PK)
- `user_id` (FK → Users)
- `action` (viewed, edited, deleted, uploaded)
- `target_table`
- `target_id`
- `timestamp`

---

## Confirmation / Additional Info Needed

For your next interview, clarify these points:

- Roles & Permissions
  - Can Branch Managers add/edit/delete cases and users?
  - Can Lawyers create new cases or only manage assigned ones?
  - Can Paralegals view full case details or only tasks?
  - Do Process Servers have unique permissions?

- Workflow
  - Confirm case statuses (Consultation → Accepted → Pre-Filing → Filing → Hearing → Closed/Terminated).
  - Should system track case history/timeline?

- Notary
  - Exact data fields needed (register number, seal, commission validity).
  - Is notary always same-day?

- Payments
  - Fixed fee vs. per service/case?
  - Partial payments allowed?
  - Should receipts be generated?

- Notifications
  - Confirm 3-day reminder rule.
  - Who receives reminders (lawyer, paralegal, branch manager)?
  - Channels: email, SMS, or both?

- Multi-Branch
  - Can staff from one branch view/handle cases from another?
  - Do you want branch-specific dashboards/reports?

- Security
  - Authentication method (Google Auth only, or also username/password)?
  - Audit logs: track who viewed/edited files?
  - Hosting preference: cloud vs. private server?
