import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getEnvBoolean, getRequiredEnvVar } from "@/lib/env";

/**
 * S3-compatible object storage client.
 *
 * Lazily constructs a singleton `S3Client` from environment variables and
 * exposes helpers to generate presigned upload/download URLs and manage keys.
 * All file bytes are transferred client-side directly to the bucket via the
 * presigned URLs; this module never streams payloads through the runtime.
 */

/**
 * Constructs a configured {@link S3Client} from the S3 environment variables.
 *
 * @returns A configured S3Client instance.
 */
function getS3Client() {
  const endpoint = getRequiredEnvVar("S3_ENDPOINT");
  const region = getRequiredEnvVar("S3_REGION");
  const accessKeyId = getRequiredEnvVar("S3_ACCESS_KEY");
  const secretAccessKey = getRequiredEnvVar("S3_SECRET_KEY");
  const forcePathStyle = getEnvBoolean("S3_FORCE_PATH_STYLE");

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
  });
}

let s3Client: S3Client;

/**
 * Returns the lazily-initialized singleton S3 client.
 *
 * @returns The singleton S3Client instance.
 */
function s3(): S3Client {
  if (!s3Client) {
    s3Client = getS3Client();
  }
  return s3Client;
}

/**
 * Returns the configured S3 bucket name.
 *
 * @returns The S3 bucket name string.
 */
function bucket(): string {
  return getRequiredEnvVar("S3_BUCKET");
}

/**
 * Builds a storage key of the form `${parentType}/${parentId}/${uuid}.${ext}`.
 *
 * @param parentType - The parent resource type (e.g. "cases").
 * @param parentId - The parent resource UUID.
 * @param fileName - Original file name used to derive the extension.
 * @returns A unique S3 object key.
 */
export function generateKey(parentType: string, parentId: string, fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const ext =
    dotIndex !== -1 && dotIndex < fileName.length - 1 ? fileName.slice(dotIndex + 1) : "bin";
  const uuid = crypto.randomUUID();
  return `${parentType}/${parentId}/${uuid}.${ext}`;
}

/**
 * Deletes the object stored at the given key.
 *
 * @param key - The S3 object key to delete.
 */
export async function deleteFile(key: string) {
  await s3().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
}

/**
 * Returns whether an object exists at the given key (false on a 404).
 *
 * @param key - The S3 object key to check.
 * @returns True if the object exists, false if a 404 is returned.
 */
export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch (e) {
    if (e instanceof NotFound) return false;
    throw e;
  }
}

const UPLOAD_URL_EXPIRY_S = 300;
const DOWNLOAD_URL_EXPIRY_S = 3600;

/**
 * Generates a presigned PUT URL the client uses to upload a file directly.
 *
 * @param key - The S3 object key to upload to.
 * @param contentType - The MIME type of the file being uploaded.
 * @param expiresIn - Expiry in seconds (default 300).
 * @returns A presigned URL string.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = UPLOAD_URL_EXPIRY_S,
): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}

/**
 * Strips control characters and quotes that are unsafe for a download filename.
 *
 * @param name - The raw filename to sanitize.
 * @returns The sanitized filename string.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/["\\]/g, "").replace(/[\x00-\x1f]/g, "");
}

/**
 * Generates a presigned GET URL the client uses to download a file directly.
 *
 * @param key - The S3 object key to download.
 * @param fileName - Optional download filename (sets Content-Disposition).
 * @param expiresIn - Expiry in seconds (default 3600).
 * @returns A presigned URL string.
 */
export async function getPresignedDownloadUrl(
  key: string,
  fileName?: string,
  expiresIn = DOWNLOAD_URL_EXPIRY_S,
): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ...(fileName
        ? { ResponseContentDisposition: `attachment; filename="${sanitizeFilename(fileName)}"` }
        : {}),
    }),
    { expiresIn },
  );
}
