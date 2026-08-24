# Document & Binary File Management

This document describes how the system stores, uploads, downloads, validates, and deletes
binary attachments (documents) attached to cases, consultations, and tasks. It complements
the [Data Models](./models.md) reference.

## Storage architecture

- **Object storage (S3-compatible)**: Binary bytes live in an external object store accessed
  via the `@aws-sdk/client-s3` client in `src/lib/s3.ts`. Files never stream through or are
  parsed by the Next.js runtime.
- **Metadata in Postgres**: The `Document` model keeps only
  pointers and metadata — `file_name`, `file_type`, `file_size`, `file_path` (the object key),
  the parent linkage (`case_id` / `consultation_id` / `task_id`), and `uploaded_by_user_id`.
- **Presigned URLs**: All reads and writes go through short-lived, server-generated presigned
  URLs. The browser PUTs/GETs the object directly against the bucket.

## Upload flow

1. The client invokes `getDocumentUploadUrlAction` (`src/features/documents/actions.ts`) with
   the file name, the client-reported MIME `file_type`, and exactly one parent reference.
2. The server validates auth, RBAC (`attachment.create`), the parent reference, and the
   allowed file type, then generates an object key and a presigned **PUT** URL.
3. The browser performs a native `fetch` PUT of the raw `File` directly to the bucket.
4. On success the client calls `confirmDocumentUploadAction`, which persists the `Document`
   row and audits the upload.

No presigned URL is issued for a disallowed type, and no `Document` row is created on confirm
unless the type still passes validation — see [Validation](#file-type-validation).

## Download flow

`getDocumentDownloadUrlAction` loads the `Document`, enforces `attachment.read`, verifies the
object still exists in storage (`objectExists`), and returns a presigned **GET** URL plus the
original file name. The browser then downloads directly from the bucket.

## Delete flow

`deleteDocumentAction` enforces `attachment.delete` (or `consultation.attachment.delete` for
consultation-scoped docs), removes the `Document` row, and deletes the underlying object from
storage.

## File type validation

Allowed upload types are **centralized** so the client and server enforce the same constraint
from a single source of truth:

- **Source of truth**: `ACCEPTED_FILE_EXTENSIONS` in `src/lib/file-types.ts`. This list feeds
  the `acceptedFileTypes` prop on the `DropZone` / `FileTrigger` UI (browser file-picker filter)
  and is imported by the document schemas.
- **Server enforcement**: `DocumentUploadPayloadSchema` and `DocumentConfirmPayloadSchema`
  (`src/features/documents/schemas.ts`) refine on `isAcceptedFileExtension(file_name)` and
  reject unsupported types with the friendly message `"Unsupported file type"`.
- **Extension, not MIME**: validation matches the file's trailing extension (case-insensitive).
  The client-supplied MIME `file_type` is untrusted and used only as the S3 object `Content-Type`,
  so the extension is the authoritative gate.

To add or remove a supported type, edit `ACCEPTED_FILE_EXTENSIONS` only — it propagates to both
the picker and the server validation automatically.

## Authorization

| Permission                       | Scope               | Used by                             |
| -------------------------------- | ------------------- | ----------------------------------- |
| `attachment.read`                | Case / Task parent  | List, view, download                |
| `attachment.create`              | Case / Task parent  | Upload (presign + confirm)          |
| `attachment.delete`              | Case / Task parent  | Delete document                     |
| `consultation.attachment.delete` | Consultation parent | Delete consultation-scoped document |

All checks run server-side in the relevant Server Action; the UI hides controls via `can(...)`
only for presentation. Reviewers/assignees never receive a presigned URL they are not authorized
for because the action authorizes before issuing it.
