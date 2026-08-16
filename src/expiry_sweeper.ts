import { infrai } from "./infrai_storage.js";
import { shouldExpire } from "./retention_policy.js";
import { BUCKET } from "./storage_setup.js";

export async function sweepExpired(now: Date): Promise<string[]> {
  const { items } = await infrai.storage.object.list(BUCKET);
  const deleted: string[] = [];
  for (const item of items) {
    if (!shouldExpire(item.key, now)) continue;
    const object = await infrai.storage.object.head(BUCKET, item.key);
    if (!object.found) continue;
    await infrai.storage.object.delete(BUCKET, item.key);
    deleted.push(item.key);
  }
  return deleted;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const deleted = await sweepExpired(new Date());
  console.log(JSON.stringify({ deletedCount: deleted.length, deleted }, null, 2));
}
