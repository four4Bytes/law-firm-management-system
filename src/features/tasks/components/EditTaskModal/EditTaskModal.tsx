"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { TextField } from "@/components/ui/TextField/TextField";
import { deleteDocumentAction } from "@/features/documents/actions";
import { FileList } from "@/features/documents/components/FileList/FileList";
import { ViewAttachmentModal } from "@/features/documents/components/ViewAttachmentModal/ViewAttachmentModal";
import { deleteNoteAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import { NoteList } from "@/features/notes/components/NoteList/NoteList";
import type { NoteRow } from "@/features/notes/queries";
import {
  addTaskReviewerAction,
  removeTaskReviewerAction,
  reviewTaskAction,
  submitTaskAction,
  updateTaskAction,
  type TaskCapabilities,
} from "@/features/tasks/actions";
import { useTaskDocuments } from "@/features/tasks/hooks/useTaskDocuments";
import { useTaskNotes } from "@/features/tasks/hooks/useTaskNotes";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { UserList } from "@/features/users/components/UserList/UserList";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/file-types";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./EditTaskModal.module.css";

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  task: TaskDetailRow;
  capabilities: TaskCapabilities;
  users: ActiveUserSummary[];
  currentUserId: string;
}

export function EditTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  task,
  capabilities,
  users,
  currentUserId,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(task.assignee_ids));
  const [reviewerIds, setReviewerIds] = useState<Set<string>>(
    new Set(task.reviewers.map((r) => r.reviewer_user_id)),
  );
  const [assignmentStatuses, setAssignmentStatuses] = useState<
    Record<string, TaskAssignmentStatus>
  >(Object.fromEntries(task.assignTo.map((a) => [a.id, a.status])));
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);
  const [isPending, setIsPending] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set());
  const {
    documents: serverDocuments,
    isLoading: isLoadingDocuments,
    previewDocument,
    setPreviewDocument,
    handleDownload,
  } = useTaskDocuments(task.id);
  const {
    notes: serverNotes,
    isLoading: isLoadingNotes,
    reload: reloadHookNotes,
  } = useTaskNotes(task.id);
  const [deletedNoteIds, setDeletedNoteIds] = useState<Set<string>>(new Set());
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);

  const isCurrentUserAssignee = task.assignee_ids.includes(currentUserId);
  const canToggleOwnSubmission = isCurrentUserAssignee && localStatus !== TaskStatus.Done;
  const currentReviewer = task.reviewers.find((r) => r.reviewer_user_id === currentUserId);
  const hasReviewed = !!currentReviewer?.reviewed_at;
  const doneCount = Object.values(assignmentStatuses).filter(
    (s) => s === TaskAssignmentStatus.Done,
  ).length;
  const totalAssignees = Object.keys(assignmentStatuses).length || task.assignTo.length;
  const approvedCount = task.reviewers.filter((r) => r.decision === "Approved").length;
  const totalReviewers = task.reviewers.length;
  const statusHint =
    localStatus === TaskStatus.Todo
      ? totalAssignees
        ? `${doneCount}/${totalAssignees} assignees done`
        : "No assignees yet"
      : localStatus === TaskStatus.InReview
        ? `${approvedCount}/${totalReviewers} approvals`
        : "All approvals complete";

  const { fileEntries, hasFiles, addFiles, removeFile, resetFiles, uploadFiles } = useFileUpload({
    taskId: task.id,
  });

  const documents = serverDocuments.filter((d) => !markedForDeletion.has(d.id));
  const notes = serverNotes.filter((n) => !deletedNoteIds.has(n.id));

  async function reloadNotes(): Promise<void> {
    reloadHookNotes();
  }

  function handleRemoveDocument(documentId: string) {
    setMarkedForDeletion((prev) => new Set(prev).add(documentId));
  }

  function handleRemoveNote(noteId: string) {
    setDeletedNoteIds((prev) => new Set(prev).add(noteId));
  }

  function handleCancel() {
    if (isPending || isToggling || isReviewing) return;
    onOpenChange(false);
  }

  async function handleToggleDone(): Promise<void> {
    if (!canToggleOwnSubmission || isToggling) return;
    const current = assignmentStatuses[currentUserId];
    const next =
      current === TaskAssignmentStatus.Done ? TaskAssignmentStatus.Todo : TaskAssignmentStatus.Done;
    setIsToggling(true);
    const prev = current;
    setAssignmentStatuses((p) => ({ ...p, [currentUserId]: next }));
    const result = await submitTaskAction({ taskId: task.id, status: next });
    if (!result.success) {
      setAssignmentStatuses((p) => ({ ...p, [currentUserId]: prev }));
      toastActionError(result, "submit task");
    } else {
      toastSuccess(
        next === TaskAssignmentStatus.Done ? "Marked done" : "Undone",
        next === TaskAssignmentStatus.Done
          ? "Your work is marked done."
          : "Your work is back to todo.",
      );
      // derive local status optimistically
      const newDone = next === TaskAssignmentStatus.Done ? doneCount + 1 : doneCount - 1;
      if (newDone === totalAssignees && localStatus === TaskStatus.Todo)
        setLocalStatus(TaskStatus.InReview);
      else if (next === TaskAssignmentStatus.Todo && localStatus === TaskStatus.InReview)
        setLocalStatus(TaskStatus.Todo);
      onSuccess();
    }
    setIsToggling(false);
  }

  async function handleReview(decision: "Approved" | "Rejected"): Promise<void> {
    if (
      !capabilities.isReviewer ||
      hasReviewed ||
      localStatus !== TaskStatus.InReview ||
      isReviewing
    )
      return;
    setIsReviewing(true);
    const result = await reviewTaskAction({ taskId: task.id, decision });
    if (!result.success) {
      toastActionError(result, "record review");
    } else {
      toastSuccess(
        decision === "Approved" ? "Approved" : "Changes requested",
        decision === "Approved" ? "You approved this task." : "You requested changes.",
      );
      setLocalStatus(decision === "Rejected" ? TaskStatus.Todo : TaskStatus.Done);
      onSuccess();
    }
    setIsReviewing(false);
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    const baseUpdate = async (): Promise<boolean> => {
      if (!capabilities.canEdit) return true;
      const parsed = TaskUpdatePayloadSchema.safeParse({
        taskId: task.id,
        title: requiredString(title),
        description: optionalString(description),
        assignee_ids: Array.from(assigneeIds),
      });
      if (!parsed.success) {
        toastError(
          "Failed to update task",
          "Please review the highlighted form fields and try again.",
        );
        return false;
      }
      const result = await updateTaskAction(parsed.data);
      if (!result.success) {
        toastActionError(result, "update task");
        return false;
      }
      return true;
    };

    setIsPending(true);

    try {
      if (!(await baseUpdate())) {
        setIsPending(false);
        return;
      }

      if (capabilities.canManageReviewers) {
        const current = new Set(task.reviewers.map((r) => r.reviewer_user_id));
        const added = [...reviewerIds].filter((id) => !current.has(id));
        const removed = [...current].filter((id) => !reviewerIds.has(id));
        let reviewerFailed = false;
        for (const id of added) {
          const result = await addTaskReviewerAction({ taskId: task.id, reviewerUserId: id });
          if (!result.success) {
            reviewerFailed = true;
            toastActionError(result, "add reviewer");
          }
        }
        for (const id of removed) {
          const result = await removeTaskReviewerAction({ taskId: task.id, reviewerUserId: id });
          if (!result.success) {
            reviewerFailed = true;
            toastActionError(result, "remove reviewer");
          }
        }
        if (reviewerFailed) {
          setIsPending(false);
          return;
        }
      }

      let hasFailedUploads = false;

      if (hasFiles) {
        const { uploaded, failed } = await uploadFiles();
        hasFailedUploads = failed > 0;
        if (failed === 0 && uploaded > 0) {
          toastSuccess(
            `Task updated with ${uploaded} file${uploaded > 1 ? "s" : ""}`,
            "The task has been updated and the new attachments were uploaded.",
          );
        }
      } else {
        toastSuccess("Task updated", "The task has been updated.");
      }

      if (markedForDeletion.size > 0) {
        const results = await Promise.all(
          Array.from(markedForDeletion).map((id) => deleteDocumentAction({ documentId: id })),
        );
        const failedCount = results.filter((r) => !r.success).length;
        if (failedCount > 0) {
          toastError(
            `Failed to delete ${failedCount} document${failedCount > 1 ? "s" : ""}`,
            "Some attachments could not be deleted. Please try again.",
          );
        }
      }

      if (deletedNoteIds.size > 0) {
        const ids = Array.from(deletedNoteIds);
        const results = await Promise.all(ids.map((id) => deleteNoteAction({ noteId: id })));
        const failedCount = results.filter((r) => !r.success).length;
        if (failedCount > 0) {
          toastError(
            `Failed to delete ${failedCount} note${failedCount > 1 ? "s" : ""}`,
            "Some notes could not be deleted. Please try again.",
          );
          setDeletedNoteIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id, i) => {
              if (results[i].success) next.delete(id);
            });
            return next;
          });
        }
      }

      if (hasFailedUploads) {
        setIsPending(false);
        return;
      }

      resetFiles();
      onOpenChange(false);
      onSuccess();
    } catch {
      toastError(
        "Unexpected error",
        "Something went wrong while updating the task. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal title="Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      {localStatus === TaskStatus.Done && (
        <div className={styles.banner}>
          Completed — editing locked. To reopen, add a new reviewer (resets to To Do).
        </div>
      )}
      <Form onSubmit={handleSave} validationBehavior="native" className={styles.form}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Enter task title..."
              validate={createFieldValidator(TaskUpdatePayloadSchema.shape.title)}
              isDisabled={isPending || !capabilities.canEdit}
            />
            <TextField
              label="Description"
              isTextArea
              rows={3}
              value={description}
              onChange={setDescription}
              placeholder="Optional description..."
              validate={createFieldValidator(TaskUpdatePayloadSchema.shape.description)}
              isDisabled={isPending || !capabilities.canEdit}
            />
            <UserSelect
              users={users}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
              isDisabled={isPending || !capabilities.isCreator}
              label="Assignees"
              hideSelected
              disabledKeys={reviewerIds}
            />
            <UserList users={task.assignTo} />

            <UserSelect
              users={users}
              selectedIds={reviewerIds}
              onChange={(next) => {
                if (localStatus === TaskStatus.Done && next.size > reviewerIds.size) {
                  const confirmed = window.confirm(
                    "This will reopen the completed task and reset all approvals to To Do. Continue?",
                  );
                  if (!confirmed) return;
                }
                setReviewerIds(next);
              }}
              isDisabled={isPending || !capabilities.canManageReviewers}
              label="Reviewers"
              hideSelected
              disabledKeys={assigneeIds}
            />
            <UserList
              users={task.reviewers.map((r) => ({
                id: r.id,
                name:
                  r.reviewer_user_id === task.created_by_user_id ? `${r.name} (creator)` : r.name,
                status: r.decision,
              }))}
            />

            <div className={styles.section}>
              <span className={styles.label}>Status</span>
              <StatusBadge
                variant={
                  localStatus === TaskStatus.Todo
                    ? "pending"
                    : localStatus === TaskStatus.InReview
                      ? "info"
                      : "done"
                }
              >
                {localStatus === "InReview" ? "In Review" : localStatus}
              </StatusBadge>
              <span className={styles.helpText}>{statusHint}</span>
            </div>

            {isCurrentUserAssignee && (
              <div className={styles.section}>
                <span className={styles.label}>Your work</span>
                <Button
                  variant={
                    assignmentStatuses[currentUserId] === TaskAssignmentStatus.Done
                      ? "secondary"
                      : "primary"
                  }
                  type="button"
                  isDisabled={isToggling || !canToggleOwnSubmission}
                  isPending={isToggling}
                  onPress={handleToggleDone}
                >
                  {assignmentStatuses[currentUserId] === TaskAssignmentStatus.Done
                    ? "Undo"
                    : "Mark done"}
                </Button>
              </div>
            )}

            {capabilities.isReviewer && (
              <div className={styles.section}>
                <span className={styles.label}>Review</span>
                <div className={styles.reviewActions}>
                  <Button
                    variant="secondary"
                    type="button"
                    isDisabled={isReviewing || hasReviewed || localStatus !== TaskStatus.InReview}
                    isPending={isReviewing}
                    onPress={() => handleReview("Approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    isDisabled={isReviewing || hasReviewed || localStatus !== TaskStatus.InReview}
                    isPending={isReviewing}
                    onPress={() => handleReview("Rejected")}
                  >
                    Request changes
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.column}>
            <DropZone
              allowsMultiple
              onFileSelect={addFiles}
              acceptedFileTypes={ACCEPTED_FILE_EXTENSIONS}
              isDisabled={isPending || !capabilities.canEdit}
              label="Drop files or click to upload"
              description="Supported: PDF, DOC, XLS, images, TXT, CSV"
            />
            <FileList
              entries={fileEntries}
              isBusy={isPending}
              onRemove={removeFile}
              existingDocuments={documents}
              onView={setPreviewDocument}
              onDownload={handleDownload}
              onDelete={capabilities.canEdit ? handleRemoveDocument : undefined}
              isLoading={isLoadingDocuments}
              showSize={false}
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.column}>
            <div className={styles.columnHeader}>
              <span className={styles.label}>Notes</span>
              <Button
                className={styles.addNoteButton}
                variant="secondary"
                type="button"
                onPress={() => setAddNoteOpen(true)}
              >
                <FaPlus /> Add Note
              </Button>
            </div>
            <NoteList
              notes={notes}
              isLoading={isLoadingNotes}
              onEdit={capabilities.canEdit ? setEditNote : undefined}
              onDelete={capabilities.canEdit ? handleRemoveNote : undefined}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            type="button"
            onPress={handleCancel}
            isDisabled={isPending || isToggling || isReviewing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isDisabled={isPending || isToggling || isReviewing}
            isPending={isPending}
          >
            Save
          </Button>
        </div>
      </Form>
      <AddNoteModal
        isOpen={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        onSuccess={reloadNotes}
        taskId={task.id}
      />
      {editNote && (
        <EditNoteModal
          isOpen={!!editNote}
          onOpenChange={() => setEditNote(null)}
          onSuccess={reloadNotes}
          note={editNote}
        />
      )}
      {previewDocument && (
        <ViewAttachmentModal
          isOpen={!!previewDocument}
          onOpenChange={() => setPreviewDocument(null)}
          document={previewDocument}
        />
      )}
    </Modal>
  );
}
