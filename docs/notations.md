# Prisma Schema Entity Relationships (Crow’s Foot Notation)

1. `User`
   - `User` (1) — (0..n) `Consultation` (createdBy)
   - `User` (1) — (0..n) `Case` (createdBy)
   - `User` (1) — (0..n) `Task` (createdBy)
   - `User` (1) — (0..n) `CaseAssignment`
   - `User` (1) — (0..n) `TaskAssignment`
   - `User` (1) — (0..n) `MilestoneNotification`
   - `User` (1) — (0..n) `Payment` (createdBy)
   - `User` (1) — (0..n) `Document` (uploadedBy)
   - `User` (1) — (0..n) `Note` (createdBy)
   - `User` (1) — (0..n) `Notary` (createdBy)
   - `User` (1) — (0..n) `CaseMilestone` (createdBy)
   - `User` (1) — (0..n) `AuditLog` (actor)

2. `Client`
   - `Client` (1) — (0..n) `Consultation`
   - `Client` (1) — (0..n) `Case`
   - `Client` (1) — (0..n) `Notary`

3. `Consultation`
   - `Consultation` (1) — (0..n) `Payment`
   - `Consultation` (1) — (0..n) `Document`
   - `Consultation` (1) — (0..n) `Note`
   - `Consultation` (1) — (0..n) `Case` (sourceConsultation)

4. `Notary`
   - `Notary` (1) — (0..n) `Payment`
   - `Notary` (1) — (0..n) `Document`
   - `Notary` (1) — (0..n) `Note`

5. `Case`
   - `Case` (1) — (0..n) `Task`
   - `Case` (1) — (0..n) `CaseAssignment`
   - `Case` (1) — (0..n) `CaseMilestone`
   - `Case` (1) — (0..n) `Payment`
   - `Case` (1) — (0..n) `Document`
   - `Case` (1) — (0..n) `Note`

6. `CaseAssignment`
   - `CaseAssignment` (n) — (1) `Case`
   - `CaseAssignment` (n) — (1) `User`

7. `TaskAssignment`
   - `TaskAssignment` (n) — (1) `Task`
   - `TaskAssignment` (n) — (1) `User`

8. `Task`
   - `Task` (1) — (0..n) `TaskAssignment`
   - `Task` (1) — (0..n) `Document`
   - `Task` (1) — (0..n) `Note`

9. `CaseMilestone`
   - `CaseMilestone` (1) — (0..n) `MilestoneNotification`

10. `MilestoneNotification`
    - `MilestoneNotification` (n) — (1) `CaseMilestone`
    - `MilestoneNotification` (n) — (1) `User`

11. `Payment`
    - `Payment` (n) — (0..1) `Case`
    - `Payment` (n) — (0..1) `Consultation`
    - `Payment` (n) — (0..1) `Notary`
    - `Payment` (n) — (1) `User` (createdBy)

12. `Document`
    - `Document` (n) — (0..1) `Case`
    - `Document` (n) — (0..1) `Consultation`
    - `Document` (n) — (0..1) `Notary`
    - `Document` (n) — (0..1) `Task`
    - `Document` (n) — (1) `User` (uploadedBy)

13. `Note`
    - `Note` (n) — (0..1) `Case`
    - `Note` (n) — (0..1) `Consultation`
    - `Note` (n) — (0..1) `Notary`
    - `Note` (n) — (0..1) `Task`
    - `Note` (n) — (1) `User` (createdBy)

14. `AuditLog`
    - `AuditLog` (n) — (1) `User` (actor)

Connector legend:

- (1) = line
- (0..1) = circle + line
- (0..n) = circle + crow’s foot
- (1..n) = line + crow’s foot
