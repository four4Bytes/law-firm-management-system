"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { deleteNoteAction, updateNoteAction } from "@/features/notes/actions";
import type { NoteRow } from "@/features/notes/queries";
import { NoteUpdatePayloadSchema } from "@/features/notes/schemas";
import { createFieldValidator, requiredString } from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./EditNoteModal.module.css";

interface EditNoteModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  note: NoteRow;
}

export function EditNoteModal({ isOpen, onOpenChange, onSuccess, note }: EditNoteModalProps) {
  const [content, setContent] = useState(note.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { isPending, submitForm } = useModalForm<z.input<typeof NoteUpdatePayloadSchema>>({
    submit: updateNoteAction,
    onOpenChange,
    onSuccess,
    successMessage: "Note updated",
    failureMessage: "Failed to update note",
    schema: NoteUpdatePayloadSchema,
  });

  function handleDismiss() {
    if (isPending || isDeleting) return;
    onOpenChange(false);
  }

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({ noteId: note.id, content: requiredString(content) });
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteNoteAction({ noteId: note.id });

      setShowDeleteConfirm(false);

      if (result.success) {
        queue.add({ title: "Note deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onSuccess();
      } else {
        queue.add({ title: result.error ?? "Failed to delete note" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete note. Please try again." }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
    }
  }

  const hasChanges = content.trim() !== note.content;

  return (
    <>
      <Modal
        title="Edit Note"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <Form onSubmit={handleSave}>
          <div className={styles.content}>
            <TextField
              isTextArea
              rows={5}
              value={content}
              onChange={setContent}
              placeholder="Enter note content..."
              validate={createFieldValidator(NoteUpdatePayloadSchema.shape.content)}
              isDisabled={isPending || isDeleting}
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                type="submit"
                isDisabled={!hasChanges || isPending || isDeleting}
                isPending={isPending}
              >
                Save
              </Button>
              <Button
                onPress={() => setShowDeleteConfirm(true)}
                isDisabled={isPending || isDeleting}
              >
                {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Note"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this note? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
