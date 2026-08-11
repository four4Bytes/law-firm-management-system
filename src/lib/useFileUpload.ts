"use client";

import { useCallback, useRef, useState } from "react";

import { queue } from "@/components/ui/Toast/Toast";
import {
  confirmDocumentUploadAction,
  getDocumentUploadUrlAction,
} from "@/features/documents/actions";
import type { FileEntry } from "@/features/documents/components/FileList/FileList";

/** Parent resource reference for document upload. */
export interface UseFileUploadParams {
  caseId?: string;
  consultationId?: string;
  taskId?: string;
}

/** State and handlers returned by {@link useFileUpload}. */
export interface UseFileUploadResult {
  fileEntries: FileEntry[];
  isUploading: boolean;
  hasFiles: boolean;
  pendingCount: number;
  failedCount: number;
  addFiles: (files: File[]) => void;
  removeFile: (id: number) => void;
  resetFiles: () => void;
  setParent: (params: UseFileUploadParams) => void;
  uploadFiles: () => Promise<{ uploaded: number; failed: number }>;
}

let entryIdCounter = 0;

/**
 * Manages multi-file upload state and orchestrates the presign → PUT →
 * confirm flow against S3 for a single parent (case, consultation, or task).
 */
export function useFileUpload(initial: UseFileUploadParams): UseFileUploadResult {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const parentRef = useRef<UseFileUploadParams>(initial);

  const pendingEntries = fileEntries.filter((e) => e.status === "pending");
  const failedEntries = fileEntries.filter((e) => e.status === "failed");

  /** Updates the upload parent after the initial render (e.g. once a task is created). */
  const setParent = useCallback((params: UseFileUploadParams) => {
    parentRef.current = params;
  }, []);

  function updateEntry(id: number, updates: Partial<FileEntry>) {
    setFileEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
    );
  }

  /** Adds files to the pending upload queue. */
  function addFiles(files: File[]) {
    setFileEntries((prev) => [
      ...prev,
      ...files.map((f) => ({
        id: entryIdCounter++,
        file: f,
        status: "pending" as const,
      })),
    ]);
  }

  /** Removes a file from the upload queue by its local entry ID. */
  function removeFile(id: number) {
    setFileEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  /** Clears all file entries and resets the upload state. */
  function resetFiles() {
    setFileEntries([]);
  }

  /** Presigns, uploads to S3, and confirms a single file. Throws on failure. */
  async function uploadSingleFile(entry: FileEntry): Promise<boolean> {
    const { caseId, consultationId, taskId } = parentRef.current;
    const payload = {
      file_name: entry.file.name,
      file_type: entry.file.type,
      case_id: caseId,
      consultation_id: consultationId,
      task_id: taskId,
    };

    const { key, uploadUrl } = await getDocumentUploadUrlAction(payload);

    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: entry.file,
      headers: { "Content-Type": entry.file.type },
    });

    if (!response.ok) {
      throw new Error(`Upload failed (HTTP ${response.status})`);
    }

    const result = await confirmDocumentUploadAction({
      ...payload,
      file_size: entry.file.size,
      file_path: key,
    });

    if (!result.success) {
      throw new Error(result.error ?? "Failed to confirm upload");
    }

    return true;
  }

  /** Uploads all pending and failed entries. Returns counts of successes and failures. */
  async function uploadFiles(): Promise<{ uploaded: number; failed: number }> {
    const targets = [...pendingEntries, ...failedEntries.filter((e) => e.status === "failed")];
    if (targets.length === 0) return { uploaded: 0, failed: 0 };

    setIsUploading(true);
    let uploaded = 0;
    let failed = 0;

    for (const entry of targets) {
      updateEntry(entry.id, { status: "uploading", error: undefined });

      try {
        await uploadSingleFile(entry);
        updateEntry(entry.id, { status: "done" });
        uploaded++;
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

    setIsUploading(false);
    return { uploaded, failed };
  }

  return {
    fileEntries,
    isUploading,
    hasFiles: fileEntries.length > 0,
    pendingCount: pendingEntries.length + failedEntries.length,
    failedCount: failedEntries.length,
    addFiles,
    removeFile,
    resetFiles,
    setParent,
    uploadFiles,
  };
}
