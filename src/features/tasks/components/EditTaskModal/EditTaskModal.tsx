"use client";

import { useEffect, useState } from "react";
import { Form } from "react-aria-components";

import { AssigneeSelect } from "@/components/ui/AssigneeSelect/AssigneeSelect";
import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { deleteDocumentAction, getDocumentsPaginatedAction } from "@/features/documents/actions";
import { FileList } from "@/features/documents/components/FileList/FileList";
import type { DocumentRow } from "@/features/documents/queries";
import { updateTaskAction } from "@/features/tasks/actions";
import type { ActiveUserSummary, TaskDetailRow } from "@/features/tasks/queries";
import { TaskUpdatePayloadSchema } from "@/features/tasks/schemas";
import { TaskStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
import { useFileUpload } from "@/lib/useFileUpload";

import styles from "./EditTaskModal.module.css";

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

interface EditTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  task: TaskDetailRow;
  users: ActiveUserSummary[];
}

export function EditTaskModal({
  isOpen,
  onOpenChange,
  onSuccess,
  task,
  users,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set(task.assignee_ids));
  const [isPending, setIsPending] = useState(false);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set());

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
        queue.add({ title: "Failed to load attachments" }, { timeout: 5000 });
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

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
      taskId: task.id,
      title: requiredString(title),
      description: optionalString(description),
      status,
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
        await Promise.all(
          Array.from(markedForDeletion).map((id) => deleteDocumentAction({ documentId: id })),
        );
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

  return (
    <Modal title="Edit Task" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSave}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Enter task title..."
              validate={createFieldValidator(TaskUpdatePayloadSchema.shape.title)}
              isDisabled={isPending}
            />
            <TextField
              label="Description"
              isTextArea
              rows={3}
              value={description}
              onChange={setDescription}
              placeholder="Optional description..."
              validate={createFieldValidator(TaskUpdatePayloadSchema.shape.description)}
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
            <FileList
              entries={fileEntries}
              isBusy={isPending}
              onRemove={removeFile}
              existingDocuments={documents}
              onDelete={handleRemoveDocument}
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
    </Modal>
  );
}
