# Plan

## Review Chain:

1. Task is set to `Pending` or `Ongoing`. Assignees update details and upload files.
2. Assignees mark the task as done → state changes to `Submitted`. Task files lock from further assignee edits while review is pending.
3. The task creator can:
   - **Final action:** Change status directly to `Accepted` or `Rejected`.
   - **Further review:** Delegate the decision by assigning a new reviewer.
4. The new reviewer gets full read context of the parent case and write access only to update this task's status. They can accept, reject, or delegate further.
