"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import {
  confirmDocumentUploadAction,
  getDocumentUploadUrlAction,
} from "@/features/documents/actions";

import styles from "./UploadDocumentModal.module.css";

interface Props {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  caseId?: string;
  consultationId?: string;
}

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

export function UploadDocumentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  consultationId,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pickerKey, setPickerKey] = useState(0);

  function handleSubmit() {
    if (!file) return;

    startTransition(async () => {
      try {
        setError(null);

        const { key, uploadUrl } = await getDocumentUploadUrlAction({
          file_name: file.name,
          file_type: file.type,
          case_id: caseId,
          consultation_id: consultationId,
        });

        const response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!response.ok) {
          throw new Error(`Upload failed (HTTP ${response.status})`);
        }

        const result = await confirmDocumentUploadAction({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: key,
          case_id: caseId,
          consultation_id: consultationId,
        });

        if (!result.success) {
          throw new Error(result.error ?? "Failed to confirm upload");
        }

        setFile(null);
        setPickerKey((k) => k + 1);
        onOpenChange(false);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleClose(open: boolean) {
    if (!isPending) {
      if (!open) {
        setFile(null);
        setError(null);
        setPickerKey((k) => k + 1);
      }
      onOpenChange(open);
    }
  }

  return (
    <Modal title="Upload Attachment" isOpen={isOpen} onOpenChange={handleClose}>
      <div className={styles.content}>
        <DropZone
          key={pickerKey}
          onFileSelect={(files) => {
            setFile(files[0]);
            setError(null);
          }}
          acceptedFileTypes={ACCEPTED_TYPES}
          isDisabled={isPending}
          description="Supported: PDF, DOC, XLS, images, TXT, CSV"
        />

        {file && (
          <p className={styles.fileInfo}>
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onPress={() => handleClose(false)} isDisabled={isPending}>
            Cancel
          </Button>
          <Button onPress={handleSubmit} isDisabled={!file || isPending}>
            {isPending ? (
              <>
                <ProgressCircle aria-label="Uploading" /> Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
