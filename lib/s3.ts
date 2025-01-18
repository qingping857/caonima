import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: "default",
  endpoint: "https://objectstorageapi.bja.sealos.run",
  credentials: {
    accessKeyId: "e70smp8t",
    secretAccessKey: "7r2txjl27476mnh6",
  },
  forcePathStyle: true,
}); 