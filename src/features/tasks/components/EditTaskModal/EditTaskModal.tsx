"use client";

import { useEffect, useState } from "react";
import { Form } from "react-aria-components";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { TextField } from "@/components/ui/TextField/TextField";
import { deleteDocumentAction, getDocumentsPaginatedAction } from "@/features/documents/actions";
import { FileList } from "@/features/documents/components/FileList/FileList";
import { ViewAttachmentModal } from "@/features/documents/components/ViewAttachmentModal/ViewAttachmentModal";
import { useDocumentDownload } from "@/features/documents/hooks/useDocumentDownload";
import type { DocumentRow } from "@/features/documents/queries";
import { deleteNoteAction, getTaskNotesAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import { NoteList } from "@/features/notes/components/NoteList/NoteList";
import type { NoteRow } from "@/features/notes/queries";
import {
  addTaskReviewerAction,
  cancelTaskAction,
  removeTaskReviewerAction,
  reviewTaskAction,
  submitTaskAction,
  updateTaskAction,
  type TaskCapabilities,
} from "@/features/tasks/actions";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { UserList } from "@/features/users/components/UserList/UserList";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { ReviewDecision, TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/file-types";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./EditTaskModal.module.css";

const statusVariant: Record<TaskStatus, StatusBadgeVariant> = {
  [TaskStatus.Pending]: "pending",
  [TaskStatus.Submitted]: "info",
  [TaskStatus.Completed]: "done",
  [TaskStatus.Cancelled]: "cancelled",
};

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
  const [decision, setDecision] = useState<"Accepted" | "Rejected" | null>(null);
  const [cancelChosen, setCancelChosen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set());
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [previewDocument, setPreviewDocument] = useState<DocumentRow | null>(null);
  const { handleDownload } = useDocumentDownload();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [deletedNoteIds, setDeletedNoteIds] = useState<Set<string>>(new Set());
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);

  const isCurrentUserAssignee = task.assignee_ids.includes(currentUserId);
  const canToggleOwnSubmission =
    isCurrentUserAssignee &&
    task.status !== TaskStatus.Completed &&
    task.status !== TaskStatus.Cancelled;

  const { fileEntries, hasFiles, addFiles, removeFile, resetFiles, uploadFiles } = useFileUpload({
    taskId: task.id,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const { rows } = await getDocumentsPaginatedAction({ taskId: task.id, pageSize: 100 });
        if (cancelled) return;
        setDocuments(rows);
      } catch {
        if (cancelled) return;
        toastError(
          "Failed to load attachments",
          "We couldn't load the attachments for this task. Please try again.",
        );
      } finally {
        if (!cancelled) setIsLoadingDocuments(false);
      }
    }

    async function loadNotes() {
      try {
        const rows = await getTaskNotesAction(task.id);
        if (cancelled) return;
        setNotes(rows);
      } catch {
        if (cancelled) return;
        toastError(
          "Failed to load notes",
          "We couldn't load the notes for this task. Please try again.",
        );
      }
    }

    void loadDocuments();
    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

  async function reloadNotes() {
    try {
      const rows = await getTaskNotesAction(task.id);
      setNotes(rows);
    } catch {
      toastError(
        "Failed to load notes",
        "We couldn't load the notes for this task. Please try again.",
      );
    }
  }

  function handleRemoveDocument(documentId: string) {
    setMarkedForDeletion((prev) => new Set(prev).add(documentId));
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  }

  function handleRemoveNote(noteId: string) {
    setDeletedNoteIds((prev) => new Set(prev).add(noteId));
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  function handleCancel() {
    if (isPending) return;
    onOpenChange(false);
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

      if (capabilities.canCancel && cancelChosen) {
        const result = await cancelTaskAction({ taskId: task.id });
        if (!result.success) {
          toastActionError(result, "cancel task");
          setIsPending(false);
          return;
        }
        resetFiles();
        onOpenChange(false);
        onSuccess();
        return;
      }

      if (isCurrentUserAssignee) {
        const chosen = assignmentStatuses[currentUserId];
        const current = task.assignTo.find((a) => a.id === currentUserId)?.status;
        if (chosen !== current) {
          const result = await submitTaskAction({ taskId: task.id, status: chosen });
          if (!result.success) {
            toastActionError(result, "submit task");
            setIsPending(false);
            return;
          }
        }
      }

      if (capabilities.canReview && decision) {
        const result = await reviewTaskAction({
          taskId: task.id,
          decision,
        });
        if (!result.success) {
          toastActionError(result, "record review");
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
      <Form onSubmit={handleSave} className={styles.form}>
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
            />
            <UserList users={task.assignTo} />

            <UserSelect
              users={users}
              selectedIds={reviewerIds}
              onChange={setReviewerIds}
              isDisabled={isPending || !capabilities.canManageReviewers}
              label="Reviewers"
              hideSelected
            />
            <UserList
              users={task.reviewers.map((r) => ({ id: r.id, name: r.name, status: r.decision }))}
            />

            <StatusBadge className={styles.statusBadge} variant={statusVariant[task.status]}>
              {task.status}
            </StatusBadge>

            {capabilities.canCancel && (
              <Checkbox isSelected={cancelChosen} onChange={setCancelChosen}>
                Cancel task
              </Checkbox>
            )}

            {isCurrentUserAssignee && (
              <div className={styles.section}>
                <Select
                  label="Submission status"
                  aria-label="Your submission status"
                  value={assignmentStatuses[currentUserId]}
                  onChange={(key) =>
                    key != null &&
                    setAssignmentStatuses((prev) => ({
                      ...prev,
                      [currentUserId]: key as TaskAssignmentStatus,
                    }))
                  }
                  isDisabled={isPending || !canToggleOwnSubmission}
                >
                  <SelectItem id={TaskAssignmentStatus.Pending}>Pending</SelectItem>
                  <SelectItem id={TaskAssignmentStatus.Submitted}>Submitted</SelectItem>
                </Select>
              </div>
            )}

            {capabilities.canReview && (
              <div className={styles.section}>
                <Select
                  label="Decision"
                  value={decision ?? null}
                  onChange={(key) => {
                    if (key != null) setDecision(key as "Accepted" | "Rejected");
                  }}
                  placeholder="Select a decision"
                >
                  <SelectItem id={ReviewDecision.Accepted}>Accept</SelectItem>
                  <SelectItem id={ReviewDecision.Rejected}>Reject</SelectItem>
                </Select>
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
              onEdit={capabilities.canEdit ? setEditNote : undefined}
              onDelete={capabilities.canEdit ? handleRemoveNote : undefined}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={isPending} isPending={isPending}>
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
