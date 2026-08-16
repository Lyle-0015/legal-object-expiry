import { z } from "zod";

export const legalObjectSchema = z.object({
  matterId: z.string().regex(/^[a-z0-9-]{3,64}$/),
  objectId: z.string().regex(/^[a-z0-9-]{3,64}$/),
  kind: z.enum(["matter-intake", "signed-document", "deadline-follow-up"]),
  contentType: z.string().min(1).max(100),
});

export type LegalObject = z.infer<typeof legalObjectSchema>;

const retentionDays: Record<LegalObject["kind"], number> = {
  "matter-intake": 7,
  "signed-document": 30,
  "deadline-follow-up": 2,
};

export function expiryFor(kind: LegalObject["kind"], now: Date): Date {
  return new Date(now.getTime() + retentionDays[kind] * 86_400_000);
}

export function objectKey(input: LegalObject, now: Date): string {
  const expires = expiryFor(input.kind, now).toISOString().slice(0, 10);
  return `expires=${expires}/${input.kind}/${input.matterId}/${input.objectId}`;
}

export function expiryFromKey(key: string): Date | null {
  const match = /^expires=(\d{4}-\d{2}-\d{2})\//.exec(key);
  if (!match) return null;
  const date = new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shouldExpire(key: string, now: Date): boolean {
  const expiry = expiryFromKey(key);
  return expiry !== null && expiry.getTime() <= now.getTime();
}
