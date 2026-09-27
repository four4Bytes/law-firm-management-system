"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Link } from "@/components/ui/Link/Link";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { FileIcon } from "@/features/documents/components/FileIcon/FileIcon";
import { useDocumentDownload } from "@/features/documents/hooks/useDocumentDownload";
import type { AuthorizedDocument } from "@/features/documents/queries";
import { formatFileCategoryName, formatFileSize, isPlayableVideo } from "@/lib/files/file-format";
import {
  getFileDescriptor,
  type FileCategory,
  type FileTypeDescriptor,
} from "@/lib/files/file-types";
import { canPreviewTextInline, readTextPreview, sliceTextPreview } from "@/lib/files/text-preview";
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
  file: FileTypeDescriptor;
  src: string;
  onDownload: () => void;
}

function Placeholder({
  category,
  message,
  onDownload,
}: {
  category: FileCategory;
  message: string;
  onDownload: () => void;
}) {
  return (
    <div className={styles.fallback}>
      <FileIcon category={category} className={styles.fallbackIcon} />
      <p className={styles.fallbackMessage}>{message}</p>
      <Button variant="secondary" onPress={onDownload}>
        <FaDownload aria-hidden="true" /> Download
      </Button>
    </div>
  );
}

function DocumentContent({ document, file, src, onDownload }: DocumentContentProps) {
  const { file_name, file_size } = document;
  const { category, mime } = file;
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
        const text = await readTextPreview(response);
        if (!controller.signal.aborted) setTextState({ src, text: sliceTextPreview(text) });
      } catch {
        if (controller.signal.aborted) return;
        setTextState({ src, failed: true });
      }
    }

    void loadText();
    return () => controller.abort();
  }, [src, isText]);

  if (category === "img") {
    return (
      <div className={styles.imageFrame}>
        <Image
          src={src}
          alt={file_name}
          fill
          sizes="(max-width: 48rem) 100vw, 90vw"
          unoptimized
          className={styles.image}
        />
      </div>
    );
  }

  if (category === "video") {
    if (!isPlayableVideo(mime)) {
      return (
        <Placeholder
          category={category}
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
          category={category}
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
          category={category}
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
      category={category}
      message={
        canPreviewTextInline(file_size ?? null)
          ? "This file type cannot be previewed. Download the file to read it."
          : "This file is too large to preview. Download the file to read it."
      }
      onDownload={onDownload}
    />
  );
}

// Full-page reading surface for one document: its metadata header, its contents
// rendered by type, and links to the case, consultation, or task it belongs to.
//
// Content that cannot be rendered here falls back to an explanatory placeholder
// offering a download, so the page never shows more than one download
// affordance, and shows it only when it is the way forward.
export function DocumentPreview({ document, src, className }: DocumentPreviewProps) {
  const { handleDownload } = useDocumentDownload();
  const download = () => void handleDownload(document);
  const { file_name, file_type, file_size, uploadedBy, created_at } = document;
  const file = getFileDescriptor({ fileName: file_name, fileType: file_type });

  return (
    <div className={clsx(styles.preview, className)}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.title} title={file_name}>
            {file_name}
          </span>
          <span className={styles.subtitle}>
            {`${formatFileCategoryName(file.category)} · ${formatFileSize(file_size)} · Uploaded by ${uploadedBy} on ${formatDate(created_at)}`}
          </span>
        </div>
      </div>

      <div className={styles.stage}>
        <DocumentContent document={document} file={file} src={src} onDownload={download} />
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
