# Document & Binary File Management

This document describes how the system stores, uploads, downloads, validates, and deletes
binary attachments (documents) attached to cases, consultations, and tasks. It complements
the [Data Models](./models.md) reference.

## Storage architecture

- **Object storage (S3-compatible)**: Binary bytes live in an external object store accessed
  via the `@aws-sdk/client-s3` client in `src/lib/infra/s3.ts`. Files never stream through or are
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
consultation-scoped docs), removes the `Document` row, then deletes the underlying object from
storage as a best-effort cleanup.

**Cascade delete flow** (case, consultation, or task): the database is the source of truth.
The parent delete mutation cascades the `Document` rows first, then invokes
`deleteDocumentFiles` (in `src/lib/files/storage-cleanup.ts`) to reclaim the S3 blobs. This cleanup
is best-effort and idempotent — failures are logged but never abort the delete. Any orphaned
S3 objects left behind are harmless and reclaimed by the storage GC sweep
(`src/app/api/cron/storage-gc/route.ts`).

The database delete never fails because storage cleanup failed; the only failure path is a
genuine database error (record not found, constraint violation, etc.).

## File type validation

Allowed upload types are **centralized** so the client and server enforce the same constraint
from a single source of truth:

- **Source of truth**: `ACCEPTED_FILE_EXTENSIONS` in `src/lib/files/file-types.ts`. This list feeds
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

## Upload size limit & duplicate rejection

Alongside file type, `src/lib/files/upload-policy.ts` centralizes the size cap and duplicate
detection so the client and server share one policy.

- **Size cap**: `getAppMaxUploadBytes()` returns the maximum permitted upload size, defaulting to
  `DEFAULT_MAX_UPLOAD_BYTES` (500 MB). It reads `APP_MAX_UPLOAD_BYTES` on the server and the
  inlined `NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES` in the browser, so the same limit is applied on both
  sides of the upload boundary. `isWithinUploadSizeLimit(bytes)` is the predicate.
- **Where it is enforced**:
  - The upload modal rejects over-sized files client-side and toasts the limit via
    `getAppMaxUploadBytes()`.
  - `DocumentConfirmPayloadSchema` (`src/features/documents/schemas.ts`) enforces the cap
    server-side on `file_size` (message: `"File is larger than the maximum upload size"`).
  - The presign (`DocumentUploadPayloadSchema`) step does not carry a `file_size`, so the size is
    not checked until confirm; the confirm-time check is what actually gates the `Document` row.
- **Duplicates**: `findDuplicateFiles(incoming, queued)` compares files by a
  `name:size:lastModified` identity so re-selecting or re-dropping the same file is reported
  instead of being silently queued twice. It detects both matches against already-queued files and
  repeats within the incoming batch.

## Preview flow

Documents can also be opened in a dedicated full-page preview at
`src/app/document/preview/[documentId]/page.tsx` (a chrome-less route outside the `(dashboard)`
group, protected by `src/proxy.ts`). The page calls `requireAuth()`, loads the document via
`getAuthorizedDocument(documentId, session)` (which enforces `task.read` for task-scoped documents
and `attachment.read` in general), verifies the
object still exists (`objectExists`), then issues a presigned **GET** URL with `inline` disposition
and renders `DocumentPreview`. Anything that cannot be rendered (unsupported type, or an unplayable
video) falls back to a placeholder offering a download.

- **Text/csv inline preview**: `src/lib/files/text-preview.ts` gates the inline text preview —
  `canPreviewTextInline(bytes)` refuses to fetch files larger than 1 MB, and
  `sliceTextPreview(text)` truncates to 4,000 characters (appending an ellipsis when content is
  dropped so the UI never implies a complete document).
- **Local preview before upload**: `src/lib/files/object-urls.ts` exposes `getObjectUrl(file)` /
  `revokeObjectUrl(file)`, a `WeakMap`-cached blob object-URL pair used to thumbnail image files
  that are queued but not yet uploaded. Object URLs pin their blob in memory until revoked, so
  callers must pair them.

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
