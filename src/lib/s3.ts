import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required S3 environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

function getS3Client() {
  const endpoint = getRequiredEnvVar("S3_ENDPOINT");
  const region = getRequiredEnvVar("S3_REGION");
  const accessKeyId = getRequiredEnvVar("S3_ACCESS_KEY");
  const secretAccessKey = getRequiredEnvVar("S3_SECRET_KEY");
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
  });
}

let s3Client: S3Client;

function s3(): S3Client {
  if (!s3Client) {
    s3Client = getS3Client();
  }
  return s3Client;
}

function bucket(): string {
  return getRequiredEnvVar("S3_BUCKET");
}

export function generateKey(parentType: string, parentId: string, fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const ext =
    dotIndex !== -1 && dotIndex < fileName.length - 1 ? fileName.slice(dotIndex + 1) : "bin";
  const uuid = crypto.randomUUID();
  return `${parentType}/${parentId}/${uuid}.${ext}`;
}

export async function deleteFile(key: string) {
  await s3().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
}

const UPLOAD_URL_EXPIRY_S = 300;
const DOWNLOAD_URL_EXPIRY_S = 3600;

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
      ...(fileName ? { ResponseContentDisposition: `attachment; filename="${fileName}"` } : {}),
    }),
    { expiresIn },
  );
}
