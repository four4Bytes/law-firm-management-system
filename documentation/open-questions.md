# Open Questions — client interview

Decisions that are **not yet validated** with the client. Each entry gives the question in plain
language, our recommendation, and the reasoning, so the conversation can be had without reading the
code. If an answer contradicts a recommendation, the spec documents linked from
[Lifecycle](./lifecycle.md) need updating first.

Where a claim rests on vendor marketing rather than documentation, it is marked as inferred.

---

## 1. Should closing a matter require a checklist? — **highest value**

**Ask:** When you close a matter, do you go through a checklist — final bill paid, trust account
cleared, client property and original documents returned, destruction date recorded, closing letter
sent? Do you want the system to enforce or record any of that?

**Current state:** No. `changeCaseStatusAction` flips `Open → Closed/Settled/Terminated` and writes an
audit row. There is no precondition of any kind.

**Recommendation: yes, and this is the most valuable missing feature in the system.**

Every file-closure checklist we found — ABA, New York State Bar, Law Society UK, Law Society of
Alberta, the Washington State Bar — is dominated by exactly these administrative steps, and the
Philippine bar's own guidance follows the same shape. They are what actually protects a closed file.
None of them are about blocking edits, which is what this system used to do instead.

This is a better answer to "how do we protect the record" than any lock could be, and it replaces the
confidence the locks were supposed to provide. See [Lifecycle](./lifecycle.md) §3.

**Suggested shape:** a closing modal with the checklist items, all confirmed before the status change
commits; store `closed_at` plus the confirmation and who confirmed it; block closing while any item is
unchecked. Feeds the `CaseMilestone` table for the destruction date.

---

## 2. Can staff add notes and files after a matter closes? — **decided, pending confirmation**

**Ask:** If a matter is closed and then a client calls about it, should staff be able to add a note
about that call?

**Current state:** Yes — fully editable in every status. This is what we implemented.

**Recommendation: keep it editable.**

Reasons: Philippine matters get reopened constantly (motion for reconsideration granted, appeal,
remanded, new petition, breached settlement). Under the previous rule the lawyer could not write the
note explaining why the matter was revived. The audit trail already records who changed what and
when.

_Inferred, not documented:_ no vendor we checked advertises matter locking. That is weak evidence —
feature pages under-report — so treat it as supporting, not decisive.

**Risk if we are wrong:** someone edits or deletes a note on a closed matter and disputes it later.
Mitigated by the audit trail, but see question 5.

---

## 3. Should a completed task be re-editable? — **decided, pending confirmation**

**Ask:** Once a reviewer has signed off on a task and it shows as Done, should the title, description,
notes, and files still be editable? Should the assignee list be?

**Current state:** Content is editable; the assignee and reviewer rosters and the
approval/assignment states are frozen; the task can still be deleted. Reopening is an explicit button.

**Recommendation: keep this split.**

The roster freeze has a real justification — the roster is what "all reviewers approved" refers to, so
changing it would change the meaning of the approval. The content freeze had none, and created a
nonsense rule: you could not fix a typo in the title but you could delete the entire task.

The reviewer-approval chain itself is worth keeping. It is stricter than anything the commercial
products do — Clio and Actionstep let you edit a completed task with no approval at all.

---

## 4. Does anyone need to be prevented from editing a specific document at the same time? — **no**

**Ask:** Does anyone ever work on a document at the same time as a colleague, where you need the
system to stop the other person saving over it?

**Current state:** No. The only locking is the database row lock (`FOR UPDATE`) inside transactions,
which is invisible to users and only prevents two conflicting writes landing at once.

**Recommendation: no, do not build it.**

Document check-out (NetDocuments, iManage) exists for one reason: two people editing the same
`.docx`. This system's documents are immutable uploads to object storage that nobody edits in place —
there is nothing to collide over. A real check-out implementation also needs holder attribution,
expiry, a "who has it" list, and a force check-in path, which is a large amount of surface area for a
firm this size.

Revisit only if document editing is ever added in-app.

---

## 5. Is the audit log detailed enough to stand in for the locks?

Now that terminal records are editable, the audit trail is the record-integrity guarantee, so its blind
spots matter more than they did:

- Note create/update/delete retain only event metadata and the note ID, following the [audit content policy](./security.md#audit-logging). Note content and previews are excluded, including on deletion.
- `task.status_changed` is now written by every path that can move the derived status — submit,
  review, and roster change — carrying `from X to Y`. Reopen records its own `task.reopened` action
  with the status move in the same entry, since nothing about a reopen is invisible without it.

The retained event detail is **unvalidated** — nobody has confirmed this level of detail is what the firm
actually wants to retain, or how long it should be kept.

---

## 6. Is the read-only consultation handoff a real requirement? — **recommend keeping**

**Ask:** Once a consultation is accepted and a case has been created from it, should the consultation
record be frozen, with all further work done on the case?

**Current state:** Yes. All fields and status changes are refused once `Accepted` **and** linked to a
case; an `Accepted` consultation with no case stays editable so it can be repaired through the accept
flow.

**Recommendation: keep it.** It mirrors the physical engagement file — once the matter is opened, the
file of record is the case. It is also the one freeze in the system with a defensible rationale, and it
is the only reason the `locked` error state still exists.

**Open sub-question:** the link is not stored on the consultation. `hasLinkedCase` asks whether any
`Case` still has `source_consultation_id` pointing here, so deleting the case makes the consultation an
editable orphan `Accepted` record again. The deletion is audited, but nothing surfaces that the
consultation silently became editable. Should it stay frozen, or warn?
