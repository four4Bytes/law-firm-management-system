import { notFound } from "next/navigation";

import { ToastRegion } from "@/components/ui/Toast/Toast";
import { DocumentPreview } from "@/features/documents/components/DocumentPreview/DocumentPreview";
import { getAuthorizedDocument } from "@/features/documents/queries";
import { getPresignedFileUrl, objectExists } from "@/lib/infra/s3";
import { requireAuth } from "@/lib/security/auth-guards";

import styles from "./page.module.css";

interface DocumentPreviewPageProps {
  params: Promise<{ documentId: string }>;
}

export default async function DocumentPreviewPage({ params }: DocumentPreviewPageProps) {
  const session = await requireAuth();
  const { documentId } = await params;

  const document = await getAuthorizedDocument(documentId, session);
  if (!document) notFound();

  const exists = await objectExists(document.file_path);
  if (!exists) notFound();

  const src = await getPresignedFileUrl(document.file_path, document.file_name, "inline");

  return (
    <main className={styles.page}>
      <DocumentPreview document={document} src={src} />
      <ToastRegion />
    </main>
  );
}
