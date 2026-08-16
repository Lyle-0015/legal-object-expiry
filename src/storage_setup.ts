import { infrai } from "./infrai_storage.js";

export const BUCKET = process.env.LEGAL_OBJECT_BUCKET ?? "legal-object-expiry";

export async function createStorage(): Promise<void> {
  await infrai.storage.bucket.create(BUCKET);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createStorage();
  console.log(JSON.stringify({ bucket: BUCKET, ready: true }));
}
