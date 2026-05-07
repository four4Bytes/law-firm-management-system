# Data Visualization:

Case only happens if the consultation turns into a case or acceptance.

```
CASE (Main Container)
├── Tasks (multiple per case)
├── Payments (first payment, second payment)
├── Notes/Memos(internal instructions)
├── Documents/Uploads (pleadings, evidence)
├── Deadlines/Due Dates
├── Status (Consultation -> Accepted -> Pre-Filing -> Filing -> Hearing -> Closed)
└── Assigned Staff (lawyer, paralegal, process server)
```

Need confirmation about notary.
And all data involved in this process.

Flow:

```
CLIENT INFO
    |
    v
  SERVICES
    |
    +--> NOTARY
    |       |
    |       v
    |   Completed (after notarization + payment)
    |
    +--> CONSULTATION
            |
            +--> ACCEPTED + PAYMENT
            |       |
            |       v
            |     CASE WORKFLOW
            |       |
            |       +--> ISSUES
            |       +--> STAGES
            |       +--> REQUIREMENTS
            |       +--> TASKS / DEADLINES
            |       +--> ASSIGN PERSON (Lawyer, Paralegal, Process Server)
            |       +--> CATEGORY (Litigation, Travel, Library, etc.)
            |
            +--> NOT ACCEPTED
                    |
                    v
                Closed (recorded as consultation only)
```

Roles:

```

SUPER ADMIN
    |
    v
ADMIN / BRANCH MANAGER
    |
    v
LAWYERS (can assign people/tasks)
    |
    v
PARALEGALS (add notes, memos, deadlines)
    |
    v
PROCESS SERVERS (carry out assigned tasks)
```
