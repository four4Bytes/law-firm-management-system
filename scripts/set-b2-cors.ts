import "dotenv/config";

import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

import { getRequiredEnvVar } from "../src/lib/env";

const S3_SECRET_KEY = getRequiredEnvVar("S3_SECRET_KEY");
const S3_ACCESS_KEY_ID = getRequiredEnvVar("S3_ACCESS_KEY_ID");
const S3_ENDPOINT = getRequiredEnvVar("S3_ENDPOINT");
const S3_REGION = getRequiredEnvVar("S3_REGION");
const S3_BUCKET = getRequiredEnvVar("S3_BUCKET");

const client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
});

async function main(): Promise<void> {
  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: S3_BUCKET,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
    console.log(`CORS rules applied successfully to ${S3_BUCKET}`);
  } catch (err) {
    console.error("Failed to set CORS rules:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
