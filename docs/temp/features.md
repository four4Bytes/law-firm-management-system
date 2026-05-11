# Summary (from the interview)

Here are the must-have features based on the interview and the workflow analysis:

Fixed Foundation for the essentials (Client Identity/Address) but a Dynamic Workspace (Lawyer’s Notes, Task lists, and Document uploads)

### 1. User authentication and role-based access

The system must support login and separate permissions for:

- Super Admin
- Admin / Branch Manager
- Lawyer
- Paralegal / Process Server

This is necessary because not everyone should be able to view, edit, assign, or delete all records.

### 2. Client and case registration

The system must allow staff to encode:

- client information
- case information
- service type such as notary or consultation
- branch/location
- case status

This is the foundation of the whole system.

### 3. Case workflow/status tracking

The system must track the legal process stages, such as:

- consultation
- accepted
- pre-filing
- filing
- hearing
- closed or terminated

This is important because legal cases move through stages, not just static records.

### 4. Deadline tracking and reminders

The system must store important dates and send reminders before deadlines, ideally around 3 days before due dates as mentioned in the interview.

This is one of the most critical requirements because missed deadlines can cause legal problems.

### 5. Task assignment and task status

The system must let authorized users:

- create tasks
- assign tasks to staff members
- mark tasks as pending or completed
- add due dates to tasks

This supports coordination between lawyers, paralegals, and process servers.

### 6. Document upload / attachment

The system must allow users to attach:

- scanned documents
- photos
- pleadings
- supporting files

Even if “scanning” is not a full scanner feature, file upload is necessary.
This feature is tied to a case.

### 7. Notes and memos

The system must allow users to add:

- notes
- instructions
- internal memos
- reminders related to a case or task

This is important for communication inside the firm.
This feature is tied to a case.

### 8. Payment tracking

The system must track whether a client has paid, including:

- first payment
- second payment
- payment status

This was specifically mentioned as a problem the firm wants to manage better.
This feature is tied to a case.

### 9. Multi-branch support

The system must work across the firm’s branches so data is centralized and consistent.

This matters because the interview mentioned multiple locations and the need for an online or application-based system.

### 10. Secure data handling

The system must protect sensitive legal documents and client data through:

- access restrictions
- secure storage
- protected login

Security is not optional here; it is a core requirement.

### 11. Search and record retrieval

The system must let users quickly find:

- clients
- cases
- tasks
- payments
- deadlines

Without search, the system would not solve the current manual tracking problem.

### 12. Status update actions

The system must allow authorized users to update records as:

- add
- update
- terminate / close

This reflects the workflow notes from the analysis.

---

# A little bit detailed

The Firm Representative wants a comprehensive legal case management system to replace their current manual process of using Word documents and Google Sheets. The desired features, as detailed in the interview, are as follows:

### 1. Case and Task Management

- Step-by-Step Workflow Tracking: The system must track the entire lifecycle of a case, from initial contact (notary or consultation) to acceptance, pre-filing (document retrieval and evidence gathering), and the various stages of hearings.
- Task Assignment and Status: Users must be able to add tasks, assign them to specific staff members, and track their status as "pending" or "completed".
- Stage-Specific Tracking: The system should include dropdown menus to select the current stage of a case (e.g., preliminary investigation, filing, etc.).
- Add Notes and Memos: Staff should have the ability to add instructions, memos, and notes to specific tasks or cases.

### 2. Automated Notifications and Alerts

- Deadline Reminders: A primary requirement is a notification system for critical legal deadlines, such as the 15-day window to file a reply.
- Advanced Alerts: The system should alert designated personnel approximately 3 days before a due date.
- Multi-Channel Notifications: Notifications should ideally be sent automatically via email or text message using the contact information saved in client and staff profiles.

### 3. File and Payment Management

- File Uploads and Attachments: Rather than a complex scanning system, the representative wants the ability to attach or upload photos and documents (such as evidence or pleadings) directly to a task or case file.
- Payment Tracking: The system must track whether a client has paid, with specific options to record "first payment" and "second payment".
- Client Information Database: A feature to save and manage basic client information and service history.

### 4. User Hierarchy and Access Control

The system requires a defined hierarchy to manage permissions across three branches:

- Super Admin: Full control over the system, including adding/removing users and deleting data.
- Admin / Branch Manager: Can assign cases to lawyers and manage branch data but cannot remove user access.
- Lawyers: Can edit their assigned cases and assign specific tasks to subordinates like paralegals.
- Paralegals and Process Servers: Can add notes, memos, and deadlines, and mark their assigned tasks as completed.

### 5. Technical and Aesthetic Requirements

- Multi-Branch Integration: The system must be online or application-based so that data from the Tagum and Katalunan branches is integrated and cohesive.
- High Security: Data privacy is a major concern; the system must be secure from hacking and unauthorized access.
- Storage and Hosting: The representative is interested in a private server or a secure cloud-based solution capable of handling large volumes of data, discussing storage needs ranging from 2TB to 12TB.
- Premium Aesthetic: The user interface should have a "premium" look, specifically using a gray, black, and gold color scheme.
