The following is a comprehensive transcript of the audio interview, compiled from the provided source material. The transcript details a discussion regarding the requirements for a legal case management system, covering current workflows, desired features, user hierarchies, and technical concerns such as security and storage.

---

### Transcript: Legal Case Management System Interview

Current Process and Identifying the Problem
The interview begins with a discussion on the current flow and the primary issues faced by the firm. The interviewee explains that the main problem is the management and tracking of files and client payments. Currently, they do not have an automated system; they use Word documents, Google Sheets, and Excel forms to track their cases. A previous system was lost due to a Facebook hack, and the current manual process lacks a notification system for deadlines.

The Step-by-Step Legal Process
The interviewee outlines the typical lifecycle of a case:

1.  Initial Contact: Clients enter for either notary services or consultation.
2.  Acceptance: If the attorney accepts the case, it moves to the "acceptance" stage.
3.  Pre-filing: This involves retrieving documents, gathering evidence, and preparing pleadings.
4.  Filing and Hearing: Once filed, the case enters various hearing stages (preliminary investigation, etc.), which vary depending on whether it is a civil, criminal, or special procedure case.
5.  Deadlines: This is a critical stage where specific timelines must be met. For example, a reply might be required within 15 days to avoid being declared in default.

System Requirements and Notifications
The firm requires a system that can track and notify specific designated persons about due dates. They suggest alerts should be sent roughly 3 days before a deadline. Because the firm has three branches (Tagum, Katalunan, and another location), the system needs to be online or application-based to ensure integrated and cohesive data entry across all locations.

Feature Set: Task Management and Scanning
The discussion covers several specific functional requirements:

- File Management: While "scanning" was mentioned, it was clarified that this could simply be a file upload/attachment feature where documents or photos are added to a task.
- Task Assignment: The system should allow users to add tasks, set them as "completed" or "pending," and assign them to specific staff members.
- Payment Tracking: There should be a way to track if a client has paid, including options for first and second payments.
- Notes and Memos: Users should be able to add notes, instructions, and memos to specific cases or tasks.
- Automated Notifications: The system should ideally send automatic reminders via email or text based on the profiles and numbers saved in the system.

User Hierarchy and Access Control
The system requires a clear hierarchy of roles to manage access:

- Super Admin: Has full control, including the ability to add or remove users and delete information.
- Admin / Branch Manager: Similar to the Super Admin but lacks the authority to remove access. They assign cases to lawyers.
- Lawyers: Can assign tasks to subordinates (like paralegals or process servers) and edit details related to their assigned cases.
- Paralegals / Process Servers: Can add notes, memos, and deadlines to tasks assigned to them and mark tasks as pending or completed.
- Clients: It is noted that clients generally do not have a part in this specific legal process tracking system.

Security and Technical Specifications
A major concern raised is security and data privacy, as the system will handle sensitive legal documents. The interviewee emphasizes that the data must be secure and protected from unauthorized access or hacking.

Regarding hosting, there was a discussion between using a cloud-based server or a physical private server. While cloud hosting is easier to manage, a physical server was considered for added privacy, though it involves hardware concerns like storage capacity (discussing needs ranging from 2TB to 12TB) and potential data duplication.

Aesthetics and Final Details
For the visual design, the interviewee prefers a "premium" look using a color scheme of gray, white, black, and gold. The interview concludes with the exchange of contact information and a commitment to research possible solutions.
