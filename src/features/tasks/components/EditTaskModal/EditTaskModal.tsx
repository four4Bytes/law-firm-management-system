"use client";

import { useEffect, useState } from "react";
import { Form } from "react-aria-components";
import { FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { deleteDocumentAction, getDocumentsPaginatedAction } from "@/features/documents/actions";
import { FileList } from "@/features/documents/components/FileList/FileList";
import type { DocumentRow } from "@/features/documents/queries";
import {
  addTaskReviewerAction,
  cancelTaskAction,
  getTaskDetailRowByIdAction,
  removeTaskReviewerAction,
  reviewTaskAction,
  submitTaskAction,
  updateTaskAction,
  type TaskCapabilities,
} from "@/features/tasks/actions";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { ReviewDecision, TaskStatus } from "@/generated/prisma/browser";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./EditTaskModal.module.css";

const ACCEPTED_TYPES = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".txt",
  ".csv",
] as const;

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  task: TaskDetailRow;
  capabilities: TaskCapabilities;
  users: ActiveUserSummary[];
}

export function EditTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  task,
  capabilities,
  users,
}: EditTaskModalProps) {
  const [detail, setDetail] = useState<TaskDetailRow>(task);
  const [caps, setCaps] = useState<TaskCapabilities>(capabilities);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(task.assignee_ids));
  const [reviewerToAdd, setReviewerToAdd] = useState<Set<string>>(new Set());
  const [decision, setDecision] = useState<"Accepted" | "Rejected" | null>(null);
  const [comment, setComment] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set());
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  const isLocked = detail.status === TaskStatus.Submitted;
  const reviewerCandidates = users.filter(
    (u) => !detail.reviewers.some((r) => r.reviewer_user_id === u.id),
  );

  const { fileEntries, hasFiles, addFiles, removeFile, resetFiles, uploadFiles } = useFileUpload({
    taskId: detail.id,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const { rows } = await getDocumentsPaginatedAction({ taskId: detail.id, pageSize: 100 });
        if (cancelled) return;
        setDocuments(rows);
      } catch {
        if (cancelled) return;
        queue.add({ title: "Failed to load attachments" }, { timeout: 5000 });
      } finally {
        if (!cancelled) setIsLoadingDocuments(false);
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [detail.id]);

  async function refresh() {
    const data = await getTaskDetailRowByIdAction(detail.id);
    if (data.row) {
      setDetail(data.row);
      setCaps(data.capabilities);
      setTitle(data.row.title);
      setDescription(data.row.description ?? "");
      setAssigneeIds(new Set(data.row.assignee_ids));
    }
  }

  function handleRemoveDocument(documentId: string) {
    setMarkedForDeletion((prev) => new Set(prev).add(documentId));
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  }

  function handleCancel() {
    if (isPending) return;
    onOpenChange(false);
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    const parsed = TaskUpdatePayloadSchema.safeParse({
      taskId: detail.id,
      title: requiredString(title),
      description: optionalString(description),
      assignee_ids: Array.from(assigneeIds),
    });

    if (!parsed.success) {
      queue.add({ title: "Failed to update task", description: "Please check the form fields" });
      return;
    }

    setIsPending(true);

    try {
      const result = await updateTaskAction(parsed.data);

      if (!result.success) {
        queue.add({ title: "Failed to update task", description: result.error });
        setIsPending(false);
        return;
      }

      let hasFailedUploads = false;

      if (hasFiles) {
        const { uploaded, failed } = await uploadFiles();
        hasFailedUploads = failed > 0;
        if (failed === 0 && uploaded > 0) {
          queue.add(
            { title: `Task updated with ${uploaded} file${uploaded > 1 ? "s" : ""}` },
            { timeout: 5000 },
          );
        }
      } else {
        queue.add({ title: "Task updated" }, { timeout: 5000 });
      }

      if (markedForDeletion.size > 0) {
        const results = await Promise.all(
          Array.from(markedForDeletion).map((id) => deleteDocumentAction({ documentId: id })),
        );
        const failedCount = results.filter((r) => !r.success).length;
        if (failedCount > 0) {
          queue.add({
            title: `Failed to delete ${failedCount} document${failedCount > 1 ? "s" : ""}`,
          });
        }
      }

      if (hasFailedUploads) {
        return;
      }

      resetFiles();
      onOpenChange(false);
      onSuccess();
    } catch {
      queue.add({
        title: "Failed to update task",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleAddReviewer() {
    if (reviewerToAdd.size === 0 || isPending) return;
    setIsPending(true);
    try {
      for (const uid of reviewerToAdd) {
        const result = await addTaskReviewerAction({ taskId: detail.id, reviewerUserId: uid });
        if (!result.success) {
          queue.add({ title: result.error ?? "Failed to add reviewer" });
        }
      }
      setReviewerToAdd(new Set());
      await refresh();
      queue.add({ title: "Reviewer added" }, { timeout: 5000 });
    } catch {
      queue.add({ title: "Failed to add reviewer" }, { timeout: 5000 });
    } finally {
      setIsPending(false);
    }
  }

  async function handleRemoveReviewer(reviewerUserId: string) {
    if (isPending) return;
    const result = await removeTaskReviewerAction({ taskId: detail.id, reviewerUserId });
    if (result.success) {
      await refresh();
      queue.add({ title: "Reviewer removed" }, { timeout: 5000 });
    } else {
      queue.add({ title: result.error ?? "Failed to remove reviewer" });
    }
  }

  async function handleSubmitForReview() {
    if (isPending) return;
    setIsPending(true);
    try {
      const result = await submitTaskAction({ taskId: detail.id });
      if (result.success) {
        await refresh();
        onSuccess();
        queue.add({ title: "Task submitted for review" }, { timeout: 5000 });
      } else {
        queue.add({ title: result.error ?? "Failed to submit task" });
      }
    } catch {
      queue.add({ title: "Failed to submit task" }, { timeout: 5000 });
    } finally {
      setIsPending(false);
    }
  }

  async function handleReview() {
    if (!decision || isPending) return;
    setIsPending(true);
    try {
      const result = await reviewTaskAction({
        taskId: detail.id,
        decision,
        comment: optionalString(comment),
      });
      if (result.success) {
        setComment("");
        setDecision(null);
        await refresh();
        onSuccess();
        queue.add({ title: "Review recorded" }, { timeout: 5000 });
      } else {
        queue.add({ title: result.error ?? "Failed to record review" });
      }
    } catch {
      queue.add({ title: "Failed to record review" }, { timeout: 5000 });
    } finally {
      setIsPending(false);
    }
  }

  async function handleCancelTask() {
    if (isPending) return;
    setIsPending(true);
    try {
      const result = await cancelTaskAction({ taskId: detail.id });
      if (result.success) {
        await refresh();
        onSuccess();
        queue.add({ title: "Task cancelled" }, { timeout: 5000 });
      } else {
        queue.add({ title: result.error ?? "Failed to cancel task" });
      }
    } catch {
      queue.add({ title: "Failed to cancel task" }, { timeout: 5000 });
    } finally {
      setIsPending(false);
      setIsCancelOpen(false);
    }
  }

  return (
    <Modal title="Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSave}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Enter task title..."
              validate={createFieldValidator(TaskUpdatePayloadSchema.shape.title)}
              isDisabled={isPending || !caps.canEdit}
            />
            <TextField
              label="Description"
              isTextArea
              rows={3}
              value={description}
              onChange={setDescription}
              placeholder="Optional description..."
              validate={createFieldValidator(TaskUpdatePayloadSchema.shape.description)}
              isDisabled={isPending || !caps.canEdit}
            />
            <UserSelect
              users={users}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
              isDisabled={isPending || !caps.isCreator}
              label="Assignees"
            />

            <div className={styles.section}>
              <span className={styles.sectionLabel}>Reviewers</span>
              <ul className={styles.reviewers}>
                {detail.reviewers.map((r) => (
                  <li key={r.id} className={styles.reviewerRow}>
                    <span>
                      {r.name}
                      {r.decision !== "Pending" && ` — ${r.decision}`}
                    </span>
                    {caps.isCreator && r.reviewer_user_id !== detail.created_by_user_id && (
                      <Button
                        variant="ghost"
                        aria-label={`Remove reviewer ${r.name}`}
                        isDisabled={isPending}
                        onPress={() => handleRemoveReviewer(r.reviewer_user_id)}
                      >
                        <FaXmark />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {caps.canManageReviewers && reviewerCandidates.length > 0 && (
                <div className={styles.addReviewer}>
                  <UserSelect
                    users={reviewerCandidates}
                    selectedIds={reviewerToAdd}
                    onChange={setReviewerToAdd}
                    isDisabled={isPending}
                    label="Add reviewer"
                    placeholder="Select a user to add..."
                  />
                  <Button
                    variant="secondary"
                    type="button"
                    isDisabled={isPending || reviewerToAdd.size === 0}
                    onPress={handleAddReviewer}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {caps.canReview && (
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Your review</span>
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
                <TextField
                  label="Comment"
                  isTextArea
                  rows={2}
                  value={comment}
                  onChange={setComment}
                  placeholder="Optional comment..."
                />
                <Button type="button" isDisabled={isPending || !decision} onPress={handleReview}>
                  Submit Review
                </Button>
              </div>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.column}>
            <DropZone
              allowsMultiple
              onFileSelect={addFiles}
              acceptedFileTypes={ACCEPTED_TYPES}
              isDisabled={isPending || isLocked}
              label="Drop files or click to upload"
              description="Supported: PDF, DOC, XLS, images, TXT, CSV"
            />
            <FileList
              entries={fileEntries}
              isBusy={isPending}
              onRemove={removeFile}
              existingDocuments={documents}
              onDelete={isLocked ? undefined : handleRemoveDocument}
              isLoading={isLoadingDocuments}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Close
          </Button>
          {caps.canSubmit && (
            <Button type="button" onPress={handleSubmitForReview} isDisabled={isPending}>
              Submit for Review
            </Button>
          )}
          {caps.canCancel && (
            <Button
              variant="ghost"
              type="button"
              onPress={() => setIsCancelOpen(true)}
              isDisabled={isPending}
            >
              Cancel Task
            </Button>
          )}
          {caps.canEdit && (
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save
            </Button>
          )}
        </div>
      </Form>

      <ConfirmDialog
        isOpen={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title="Cancel Task"
        confirmLabel="Cancel Task"
        onConfirm={handleCancelTask}
      >
        Are you sure you want to cancel this task? This cannot be undone.
      </ConfirmDialog>
    </Modal>
  );
}
