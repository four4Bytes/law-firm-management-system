"use client";

import { useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { FileList } from "@/features/documents/components/FileList/FileList";
import { addTaskReviewerAction, createTaskAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { TaskCreatePayloadSchema } from "@/features/tasks/schemas";
import { UserSelect } from "@/features/users/components/UserSelect/UserSelect";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/file-types";
import { createFieldValidator, optionalString, requiredString } from "@/lib/form-utils";
import { toastActionError, toastError, toastInfo, toastSuccess } from "@/lib/toast-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./AddTaskModal.module.css";

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId: string;
  users: ActiveUserSummary[];
}

export function AddTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  users,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [reviewerIds, setReviewerIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [addedReviewerIds, setAddedReviewerIds] = useState<Set<string>>(new Set());

  const { fileEntries, hasFiles, addFiles, removeFile, resetFiles, setParent, uploadFiles } =
    useFileUpload({ caseId });

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssigneeIds(new Set());
    setReviewerIds(new Set());
    setCreatedTaskId(null);
    setAddedReviewerIds(new Set());
    resetFiles();
  }

  function handleCancel() {
    if (isPending) return;
    resetForm();
    onOpenChange(false);
  }

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    if (assigneeIds.size < 1) {
      toastError(
        "Add at least one assignee",
        "A task needs at least one assignee before it can be created.",
      );
      return;
    }

    const parsed = TaskCreatePayloadSchema.safeParse({
      title: requiredString(title),
      description: optionalString(description),
      case_id: caseId,
      assignee_ids: Array.from(assigneeIds),
    });

    if (!parsed.success) {
      toastError(
        "Failed to create task",
        "Please review the highlighted form fields and try again.",
      );
      return;
    }

    setIsPending(true);

    try {
      let taskId = createdTaskId;

      if (!taskId) {
        const result = await createTaskAction(parsed.data);

        if (!result.success || !result.data) {
          toastActionError(result, "create task");
          setIsPending(false);
          return;
        }

        setCreatedTaskId(result.data.id);
        taskId = result.data.id;
      }

      if (reviewerIds.size > 0) {
        let reviewerFailed = false;
        for (const id of reviewerIds) {
          if (addedReviewerIds.has(id)) continue;
          const result = await addTaskReviewerAction({ taskId, reviewerUserId: id });
          if (!result.success) {
            reviewerFailed = true;
            toastActionError(result, "add reviewer");
            continue;
          }
          setAddedReviewerIds((prev) => new Set(prev).add(id));
        }
        if (reviewerFailed) {
          setIsPending(false);
          return;
        }
      }

      if (hasFiles) {
        setParent({ taskId });
        const { uploaded, failed } = await uploadFiles();
        if (failed > 0) {
          toastInfo(
            "Task created, but some files failed to upload",
            "The task was created, but some attachments did not upload. Try adding them again.",
          );
          return;
        }
        if (uploaded > 0) {
          toastSuccess(
            `Task created with ${uploaded} file${uploaded > 1 ? "s" : ""}`,
            "The task and its attachments have been added.",
          );
        }
      } else {
        toastSuccess("Task created", "The task has been created.");
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      toastError(
        "Unexpected error",
        "Something went wrong while creating the task. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal title="Add Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSubmit}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Enter task title..."
              validate={createFieldValidator(TaskCreatePayloadSchema.shape.title)}
              isDisabled={isPending}
            />
            <TextField
              label="Description"
              isTextArea
              rows={3}
              value={description}
              onChange={setDescription}
              placeholder="Optional description..."
              validate={createFieldValidator(TaskCreatePayloadSchema.shape.description)}
              isDisabled={isPending}
            />
            <UserSelect
              users={users}
              selectedIds={assigneeIds}
              onChange={setAssigneeIds}
              isDisabled={isPending}
            />
            <UserSelect
              users={users}
              selectedIds={reviewerIds}
              onChange={setReviewerIds}
              isDisabled={isPending}
              label="Reviewers"
              placeholder="Select reviewers..."
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.column}>
            <DropZone
              allowsMultiple
              onFileSelect={addFiles}
              acceptedFileTypes={ACCEPTED_FILE_EXTENSIONS}
              isDisabled={isPending}
              label="Drop files or click to upload"
              description="Supported: PDF, DOC, XLS, images, TXT, CSV"
            />
            <FileList entries={fileEntries} isBusy={isPending} onRemove={removeFile} />
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={isPending} isPending={isPending}>
            Create Task
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
