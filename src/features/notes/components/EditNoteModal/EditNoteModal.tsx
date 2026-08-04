"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { updateNoteAction } from "@/features/notes/actions";
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

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof NoteUpdatePayloadSchema>
  >({
    submit: updateNoteAction,
    onOpenChange,
    onSuccess,
    successMessage: "Note updated",
    failureMessage: "Failed to update note",
    schema: NoteUpdatePayloadSchema,
  });

  async function handleSave(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({ noteId: note.id, content: requiredString(content) });
  }

  return (
    <Modal title="Edit Note" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSave}>
        <div className={styles.content}>
          <TextField
            label="Note"
            isTextArea
            rows={5}
            value={content}
            onChange={setContent}
            placeholder="Enter note content..."
            validate={createFieldValidator(NoteUpdatePayloadSchema.shape.content)}
            isDisabled={isPending}
          />
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isDisabled={isPending} isPending={isPending}>
              Save
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
