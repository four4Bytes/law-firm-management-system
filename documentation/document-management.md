# Document & Binary File Management

This document describes how the system stores, uploads, downloads, validates, and deletes
binary attachments (documents) attached to cases, consultations, and tasks. It complements
the [Data Models](./models.md) reference.

## Storage architecture

- **Object storage (S3-compatible)**: Binary bytes live in an external object store accessed
  via the `@aws-sdk/client-s3` client in `src/lib/infra/s3.ts`. Files never stream through or are
  parsed by the Next.js runtime.
- **Metadata in Postgres**: The `Document` model keeps only
  pointers and metadata - `file_name`, `file_type`, `file_size`, `file_path` (the object key),
  the parent linkage (`case_id` / `consultation_id` / `task_id`), and `uploaded_by_user_id`.
  `file_type` holds the MIME type derived from the extension; see [Validation](#file-type-validation).
- **Presigned URLs**: All reads and writes go through short-lived, server-generated presigned
  URLs. The browser PUTs/GETs the object directly against the bucket.

## Upload flow

1. The client invokes `getDocumentUploadUrlAction` (`src/features/documents/actions.ts`) with the
   file name and exactly one parent reference. It sends no MIME type.
2. The server validates auth, RBAC (`attachment.create`), the parent reference, and the allowed file
   extension, then generates an object key and a presigned **PUT** URL. The MIME type is derived from
   the extension (see [Validation](#file-type-validation)) and returned alongside the URL.
3. The browser performs a native `fetch` PUT of the raw `File` directly to the bucket, echoing the
   server's `contentType` as the request `Content-Type` so it matches the signed header.
4. On success the client calls `confirmDocumentUploadAction`, which re-checks the key against the
   authorized parent (see [Key binding](#upload-key-binding)) and verifies the stored object's size
   with S3 before persisting the `Document` row and auditing the upload.

No presigned URL is issued for a disallowed type, and no `Document` row is created on confirm
unless the type still passes validation - see [Validation](#file-type-validation).

## Upload key binding

Object keys are generated as `${parentType}/${parentId}/${uuid}.${ext}` (`generateKey` in
`src/lib/infra/s3.ts`), so every object lives under the namespace of exactly one parent.

`file_path` arrives from the client, so `confirmDocumentUploadAction` requires that it sits under
the prefix of the parent it just authorized (`isKeyWithinPrefix`) and ends with the extension implied
by the declared `file_name`. Without this, a user who is a member of two cases could confirm a key
belonging to one into a row in the other, attaching the same evidence to two matters. The check runs
after authorization and before the S3 `HeadObject`, so a foreign key is never used as an existence
oracle; failures return the forbidden envelope.

Residual limitation: the prefix proves the key belongs to the authorized parent, not that this upload
produced it, so a user can still attach a sibling object from the _same_ case under an extra row.

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
is best-effort and idempotent - failures are logged but never abort the delete. Any orphaned
S3 objects left behind are harmless and reclaimed by the storage GC sweep
(`src/app/api/cron/storage-gc/route.ts`).

The database delete never fails because storage cleanup failed; the only failure path is a
genuine database error (record not found, constraint violation, etc.).

## File type validation

Allowed upload types are **centralized** so the client and server enforce the same constraint
from a single source of truth:

- **Source of truth**: the `FILE_TYPE_REGISTRY` table in `src/lib/files/file-types.ts`, which maps
  each accepted extension to its display category, label, and MIME type. `ACCEPTED_FILE_EXTENSIONS`
  is derived from its keys and feeds the `acceptedFileTypes` prop on the `DropZone` / `FileTrigger`
  UI, so an extension cannot be accepted without presentation metadata.
- **Server enforcement**: `DocumentUploadPayloadSchema` and `DocumentConfirmPayloadSchema`
  (`src/features/documents/schemas.ts`) refine on `isAcceptedFileExtension(file_name)` and
  reject unsupported types with the friendly message `"Unsupported file type"`.
- **Extension, not client MIME**: validation and resolution both key off the trailing extension
  (case-insensitive). No MIME type is accepted from the client; the server derives one from the
  extension for the presigned PUT's `Content-Type` and the stored `file_type`, and the client echoes
  that value back so the signed header and the request agree.

To add or remove a supported type, edit the registry only - it propagates to the picker, the
server validation, and the UI presentation automatically.

### How a file's type is resolved

`getFileDescriptor({ fileName, fileType })` (`src/lib/files/file-types.ts`) is the single entry
point used by icons, labels, and previews. It resolves **extension-first**, falling back to the
stored MIME type only for extensions outside the registry:

- An allowlisted extension always wins, so a file is described by its name even when the stored
  type disagrees or is missing.
- Otherwise the stored `file_type` is normalized (parameters and casing stripped; empty and
  `application/octet-stream` treated as absent) and matched against a substring classifier. Its
  branch order is significant: OpenXML Word and Excel types both contain `"document"`, so the
  spreadsheet branches are tested first.
- When neither signal is informative the descriptor's label is empty, and callers omit it rather
  than render a placeholder.

`file_type` is kept because it is the only record of type for files whose extension is outside the
allowlist, which the seed exercises with a `.zip` evidence bundle.

The registry's MIME type is a hint inferred from the extension, not one verified against the file's
bytes - the same trust boundary the upload allowlist already applies.

The attachments table's **Type** column is not sortable: its label is per-extension (`DOCX`) while
ordering would use the MIME string, whose collation places `DOCX` after `XLSX`.

## Upload size limit & duplicate rejection

Alongside file type, `src/lib/files/upload-policy.ts` centralizes the size cap and duplicate
detection so the client and server share one policy.

- **Size cap**: `getAppMaxUploadBytes()` returns the maximum permitted upload size, defaulting to
  `DEFAULT_MAX_UPLOAD_BYTES` (500 MB). Set `NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES` to configure the
  same limit on the server and in the browser bundle. `APP_MAX_UPLOAD_BYTES` is not used.
  `isWithinUploadSizeLimit(bytes)` is the predicate.
- **Where it is enforced**:
  - The upload modal rejects over-sized files client-side and toasts the limit via
    `getAppMaxUploadBytes()`.
  - `DocumentConfirmPayloadSchema` (`src/features/documents/schemas.ts`) checks the client-reported
    `file_size`. `confirmDocumentUploadAction` also reads S3 `ContentLength`, rejects a missing or
    oversized object, and saves that verified size in the document row.
  - The presign (`DocumentUploadPayloadSchema`) step does not carry a `file_size`, so the size is
    not checked until confirm; the storage-backed check gates the `Document` row.
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

- **Text/csv inline preview**: `src/lib/files/text-preview.ts` gates the inline text preview -
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
