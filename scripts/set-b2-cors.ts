/**
 * Applies CORS rules to a Backblaze B2 bucket via the S3-compatible API.
 *
 * The B2 web dashboard's CORS toggle only affects the B2 Native API, not the
 * S3-compatible API. Presigned URLs hit the S3 endpoint, so CORS must be set
 * directly via the S3 API.
 *
 * Usage:
 *   S3_SECRET_KEY="<app-key-secret>" npx tsx scripts/set-b2-cors.ts
 *
 * Env:
 *   S3_SECRET_KEY  — The application key secret (NOT the key ID), shown once
 *                    when the key is created in the B2 dashboard.
 *
 * This script hardcodes the bucket name, endpoint, region, and access key ID
 * for "law-firm-bucket" in eu-central-003. Update these if the bucket or
 * credentials change.
 */

import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const secretAccessKey = process.env.S3_SECRET_KEY;
if (!secretAccessKey) {
  console.error("Missing S3_SECRET_KEY environment variable");
  process.exit(1);
}

const client = new S3Client({
  region: "eu-central-003",
  endpoint: "https://s3.eu-central-003.backblazeb2.com",
  credentials: {
    accessKeyId: "003a1b2b85f73980000000001",
    secretAccessKey,
  },
  forcePathStyle: false,
  requestChecksumCalculation: "WHEN_REQUIRED",
});

async function main() {
  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: "law-firm-bucket",
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
    console.log("CORS rules applied successfully to law-firm-bucket");
  } catch (err) {
    console.error("Failed to set CORS rules:", err);
    process.exit(1);
  }
}

main();
