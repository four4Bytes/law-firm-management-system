"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { DropZone } from "@/components/ui/DropZone/DropZone";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { queue } from "@/components/ui/Toast/Toast";
import {
  confirmDocumentUploadAction,
  getDocumentUploadUrlAction,
} from "@/features/documents/actions";
import { FileList, type FileEntry } from "@/features/documents/components/FileList/FileList";

import styles from "./UploadDocumentModal.module.css";

interface UploadDocumentModalProps {
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

let nextEntryId = 0;

export function UploadDocumentModal({
  isOpen,
  onOpenChange,
  onSuccess,
  caseId,
  consultationId,
}: UploadDocumentModalProps) {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const hasUploading = fileEntries.some((e) => e.status === "uploading");
  const pendingEntries = fileEntries.filter((e) => e.status === "pending");
  const failedEntries = fileEntries.filter((e) => e.status === "failed");
  const uploadingEntries = fileEntries.filter((e) => e.status === "uploading");

  function updateEntry(id: number, updates: Partial<FileEntry>) {
    setFileEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
    );
  }

  function removeEntry(id: number) {
    setFileEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function resetState() {
    setFileEntries([]);
  }

  function handleClose(open: boolean) {
    if (isUploading || hasUploading) return;
    if (!open) {
      if (failedEntries.length > 0) {
        queue.add({
          title: `${failedEntries.length} file${failedEntries.length > 1 ? "s" : ""} failed to upload`,
        });
      }
      resetState();
    }
    onOpenChange(open);
  }

  async function uploadSingleFile(file: File) {
    const documentPayload = {
      file_name: file.name,
      file_type: file.type,
      case_id: caseId,
      consultation_id: consultationId,
    };

    const { key, uploadUrl } = await getDocumentUploadUrlAction(documentPayload);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!response.ok) {
      throw new Error(`Upload failed (HTTP ${response.status})`);
    }

    const result = await confirmDocumentUploadAction({
      ...documentPayload,
      file_size: file.size,
      file_path: key,
    });

    if (!result.success) {
      throw new Error(result.error ?? "Failed to confirm upload");
    }
  }

  async function runUploads(targets: FileEntry[]): Promise<number> {
    let failed = 0;

    for (const entry of targets) {
      updateEntry(entry.id, { status: "uploading", error: undefined });

      try {
        await uploadSingleFile(entry.file);
        updateEntry(entry.id, { status: "done" });
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : "Upload failed";
        updateEntry(entry.id, { status: "failed", error: message });
        queue.add({
          title: `Failed to upload "${entry.file.name}"`,
          description: message,
        });
      }
    }

    return failed;
  }

  async function finishUploads(targets: FileEntry[], externalFailedCount = 0) {
    setIsUploading(true);
    try {
      const failed = await runUploads(targets);

      if (failed === 0 && externalFailedCount === 0) {
        queue.add(
          { title: `${targets.length} file${targets.length > 1 ? "s" : ""} uploaded` },
          { timeout: 5000 },
        );
        resetState();
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      queue.add({
        title: "Upload failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmitAll() {
    const targets = pendingEntries;
    const targetIds = new Set(targets.map((e) => e.id));
    const externalFailedCount = failedEntries.filter((e) => !targetIds.has(e.id)).length;

    finishUploads(targets, externalFailedCount);
  }

  function handleRetryFailed() {
    finishUploads(failedEntries);
  }

  function handleFileSelect(files: File[]) {
    setFileEntries((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: nextEntryId++,
        file: f,
        status: "pending" as const,
      })),
    ]);
  }

  const hasFiles = fileEntries.length > 0;
  const isBusy = isUploading || hasUploading || uploadingEntries.length > 0;

  return (
    <Modal title="Upload Attachment" isOpen={isOpen} onOpenChange={handleClose}>
      <div className={styles.content}>
        <DropZone
          allowsMultiple
          onFileSelect={handleFileSelect}
          acceptedFileTypes={ACCEPTED_TYPES}
          isDisabled={isBusy}
          description="Supported: PDF, DOC, XLS, images, TXT, CSV"
        />

        <FileList entries={fileEntries} isBusy={isBusy} onRemove={removeEntry} />

        <div className={styles.actions}>
          <Button variant="secondary" onPress={() => handleClose(false)} isDisabled={isBusy}>
            Cancel
          </Button>

          {failedEntries.length > 0 && pendingEntries.length === 0 ? (
            <Button onPress={handleRetryFailed} isDisabled={isBusy || failedEntries.length === 0}>
              {isBusy ? (
                <>
                  <ProgressCircle aria-label="Uploading" /> Uploading...
                </>
              ) : (
                `Retry Failed (${failedEntries.length})`
              )}
            </Button>
          ) : (
            <Button
              onPress={handleSubmitAll}
              isDisabled={!hasFiles || pendingEntries.length === 0 || isBusy}
            >
              {isBusy ? (
                <>
                  <ProgressCircle aria-label="Uploading" /> Uploading...
                </>
              ) : (
                `Upload All (${pendingEntries.length})`
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
