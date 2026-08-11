"use client";

import { useState } from "react";
import { Form } from "react-aria-components";

import { AssigneeSelect } from "@/components/ui/AssigneeSelect/AssigneeSelect";
import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { FileList } from "@/features/documents/components/FileList/FileList";
import { createTaskAction } from "@/features/tasks/actions";
import type { ActiveUserSummary } from "@/features/tasks/queries";
import { TaskCreatePayloadSchema } from "@/features/tasks/schemas";
import { TaskStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./AddTaskModal.module.css";

const STATUS_OPTIONS = Object.values(TaskStatus);

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
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.Pending);
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  const { fileEntries, hasFiles, addFiles, removeFile, resetFiles, setParent, uploadFiles } =
    useFileUpload({ caseId });

  function resetForm() {
    setTitle("");
    setDescription("");
    setStatus(TaskStatus.Pending);
    setAssigneeIds(new Set());
    setCreatedTaskId(null);
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

    const parsed = TaskCreatePayloadSchema.safeParse({
      title: requiredString(title),
      description: optionalString(description),
      status,
      case_id: caseId,
      assignee_ids: Array.from(assigneeIds),
    });

    if (!parsed.success) {
      queue.add({ title: "Failed to create task", description: "Please check the form fields" });
      return;
    }

    setIsPending(true);

    try {
      let taskId = createdTaskId;

      if (!taskId) {
        const result = await createTaskAction(parsed.data);

        if (!result.success || !result.data) {
          queue.add({ title: "Failed to create task", description: result.error });
          setIsPending(false);
          return;
        }

        setCreatedTaskId(result.data.id);
        taskId = result.data.id;
      }

      if (hasFiles) {
        setParent({ taskId });
        const { uploaded, failed } = await uploadFiles();
        if (failed > 0) {
          queue.add({ title: "Task created, but some files failed to upload" }, { timeout: 5000 });
          return;
        }
        if (uploaded > 0) {
          queue.add(
            { title: `Task created with ${uploaded} file${uploaded > 1 ? "s" : ""}` },
            { timeout: 5000 },
          );
        }
      } else {
        queue.add({ title: "Task created" }, { timeout: 5000 });
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      queue.add({
        title: "Failed to create task",
        description: "An unexpected error occurred. Please try again.",
      });
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
            <Select
              label="Status"
              value={status}
              onChange={selectEnumHandler(TaskStatus, setStatus)}
              isDisabled={isPending}
            >
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} id={s}>
                  {s}
                </SelectItem>
              ))}
            </Select>
            <AssigneeSelect
              users={users}
              assigneeIds={assigneeIds}
              onChange={setAssigneeIds}
              isDisabled={isPending}
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.column}>
            <DropZone
              allowsMultiple
              onFileSelect={addFiles}
              acceptedFileTypes={ACCEPTED_TYPES}
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
