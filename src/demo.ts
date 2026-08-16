import { legalObjectSchema, objectKey } from "./retention_policy.js";

const input = legalObjectSchema.parse({
  matterId: "matter-1042",
  objectId: "client-intake-1",
  kind: "matter-intake",
  contentType: "application/pdf",
});

console.log({ input, key: objectKey(input, new Date("2026-08-16T12:00:00.000Z")) });
