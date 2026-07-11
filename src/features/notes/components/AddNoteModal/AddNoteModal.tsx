"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { createNoteAction } from "@/features/notes/actions";
import { NoteCreatePayloadSchema } from "@/features/notes/schemas";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./AddNoteModal.module.css";

interface AddNoteModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId?: string;
  consultationId?: string;
}

export function AddNoteModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  consultationId,
}: AddNoteModalProps) {
  const [content, setContent] = useState("");

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof NoteCreatePayloadSchema>
  >({
    submit: createNoteAction,
    onOpenChange,
    onSuccess,
    successMessage: "Note added",
    failureMessage: "Failed to add note",
    reset: () => setContent(""),
  });

  async function handleSubmit() {
    if (!content.trim()) return;

    await submitForm({
      content: content.trim(),
      case_id: caseId ?? null,
      consultation_id: consultationId ?? null,
    });
  }

  return (
    <Modal title="Add Note" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <div className={styles.content}>
        <TextField
          label="Note"
          isTextArea
          rows={5}
          value={content}
          onChange={setContent}
          placeholder="Enter note content..."
          isDisabled={isPending}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button onPress={handleSubmit} isDisabled={!content.trim() || isPending}>
            {isPending ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
