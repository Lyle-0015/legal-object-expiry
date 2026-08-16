import assert from "node:assert/strict";
import test from "node:test";
import { legalObjectSchema, objectKey, shouldExpire } from "../src/retention_policy.js";

test("deadline follow-up expires sooner than signed evidence", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  const base = { matterId: "matter-1042", objectId: "notice-7", contentType: "application/pdf" };
  const followUp = objectKey(legalObjectSchema.parse({ ...base, kind: "deadline-follow-up" }), now);
  const signed = objectKey(legalObjectSchema.parse({ ...base, kind: "signed-document" }), now);

  assert.equal(followUp, "expires=2026-08-18/deadline-follow-up/matter-1042/notice-7");
  assert.equal(shouldExpire(followUp, new Date("2026-08-18T00:00:00.000Z")), true);
  assert.equal(shouldExpire(signed, new Date("2026-08-18T00:00:00.000Z")), false);
});
