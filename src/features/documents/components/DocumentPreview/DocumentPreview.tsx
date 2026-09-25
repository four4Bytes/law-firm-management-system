"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Link } from "@/components/ui/Link/Link";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { FileIcon } from "@/features/documents/components/FileIcon/FileIcon";
import { useDocumentDownload } from "@/features/documents/hooks/useDocumentDownload";
import type { AuthorizedDocument } from "@/features/documents/queries";
import {
  classifyFileType,
  formatFileCategoryName,
  formatFileSize,
  isPlayableVideo,
} from "@/lib/files/file-format";
import { canPreviewTextInline, sliceTextPreview } from "@/lib/files/text-preview";
import { formatDate } from "@/lib/primitives/date";

import styles from "./DocumentPreview.module.css";

type TextPreviewState = { src: string; text: string } | { src: string; failed: true };

interface DocumentPreviewProps {
  document: AuthorizedDocument;
  src: string;
  className?: string;
}

interface DocumentContentProps {
  document: AuthorizedDocument;
  src: string;
  onDownload: () => void;
}

function Placeholder({
  fileType,
  message,
  onDownload,
}: {
  fileType: string;
  message: string;
  onDownload: () => void;
}) {
  return (
    <div className={styles.fallback}>
      <FileIcon fileType={fileType} className={styles.fallbackIcon} />
      <p className={styles.fallbackMessage}>{message}</p>
      <Button variant="secondary" onPress={onDownload}>
        <FaDownload aria-hidden="true" /> Download
      </Button>
    </div>
  );
}

function DocumentContent({ document, src, onDownload }: DocumentContentProps) {
  const { file_type, file_name, file_size } = document;
  const category = classifyFileType(file_type);
  const isText = category === "txt" && canPreviewTextInline(file_size ?? null);
  const [textState, setTextState] = useState<TextPreviewState | null>(null);

  const isResolvedForSrc = textState !== null && textState.src === src;
  const textFailed = isResolvedForSrc && "failed" in textState;
  const text = isResolvedForSrc && "text" in textState ? textState.text : null;

  useEffect(() => {
    if (!isText) return;

    const controller = new AbortController();

    async function loadText() {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) throw new Error("Failed to load text preview");
        setTextState({ src, text: sliceTextPreview(await response.text()) });
      } catch {
        if (controller.signal.aborted) return;
        setTextState({ src, failed: true });
      }
    }

    void loadText();
    return () => controller.abort();
  }, [src, isText]);

  if (category === "img") {
    return <img src={src} alt={file_name} className={styles.image} />;
  }

  if (category === "video") {
    if (!isPlayableVideo(file_type)) {
      return (
        <Placeholder
          fileType={file_type}
          message="This video format cannot be played in your browser. Download it to view the footage."
          onDownload={onDownload}
        />
      );
    }

    return (
      <video src={src} controls preload="metadata" className={styles.video}>
        Your browser cannot play this video.
      </video>
    );
  }

  if (category === "pdf") {
    return (
      <object data={src} type="application/pdf" className={styles.pdf}>
        <Placeholder
          fileType={file_type}
          message="Preview unavailable in this browser. Download the file to read it."
          onDownload={onDownload}
        />
      </object>
    );
  }

  if (isText) {
    if (text === null) {
      return textFailed ? (
        <Placeholder
          fileType={file_type}
          message="The preview could not be loaded."
          onDownload={onDownload}
        />
      ) : (
        <div className={styles.textContainer}>
          <ProgressCircle aria-label={`Loading preview of ${file_name}`} />
        </div>
      );
    }

    return (
      <pre className={clsx(styles.textContainer, styles.text)}>
        <code>{text}</code>
      </pre>
    );
  }

  return (
    <Placeholder
      fileType={file_type}
      message={
        canPreviewTextInline(file_size ?? null)
          ? "This file type cannot be previewed. Download the file to read it."
          : "This file is too large to preview. Download the file to read it."
      }
      onDownload={onDownload}
    />
  );
}

/**
 * Full-page reading surface for one document: its metadata header, its contents
 * rendered by type, and links to the case, consultation, or task it belongs to.
 * Content that cannot be rendered here falls back to an explanatory placeholder
 * offering a download, so the page never shows more than one download
 * affordance and shows it only when it is the way forward.
 */
export function DocumentPreview({ document, src, className }: DocumentPreviewProps) {
  const { handleDownload } = useDocumentDownload();
  const download = () => void handleDownload(document);

  return (
    <div className={clsx(styles.preview, className)}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.title} title={document.file_name}>
            {document.file_name}
          </span>
          <span className={styles.subtitle}>
            {`${formatFileCategoryName(document.file_type)} · ${formatFileSize(document.file_size)} · Uploaded by ${document.uploadedBy} on ${formatDate(document.created_at)}`}
          </span>
        </div>
      </div>

      <div className={styles.stage}>
        <DocumentContent document={document} src={src} onDownload={download} />
      </div>

      <p className={styles.contextNote}>
        {document.case && (
          <span>
            Attached to case:{" "}
            <Link href={`/case/${document.case.id}`} className={styles.contextLink}>
              {document.case.case_title}
            </Link>
          </span>
        )}
        {document.consultation && (
          <span>
            Attached to consultation:{" "}
            <Link href={`/consultation/${document.consultation.id}`} className={styles.contextLink}>
              {document.consultation.concern}
            </Link>
          </span>
        )}
        {document.task && document.task.case_id && (
          <span>
            Linked to task:{" "}
            <Link href={`/case/${document.task.case_id}`} className={styles.contextLink}>
              {document.task.title}
            </Link>
          </span>
        )}
      </p>
    </div>
  );
}
