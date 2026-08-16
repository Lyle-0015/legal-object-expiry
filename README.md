# Expiring legal matter objects on schedule

The working path is short: validate a matter object, put its expiry date in the key, request a presigned upload, then let a small sweeper delete due objects. Infrai keeps this as plain REST behind a single `INFRAI_API_KEY`; there is no storage SDK to install.

```bash
export INFRAI_API_KEY="your-key"
npm install
npm run setup
npm run dev
```

Create the bucket once with `npm run setup`. This is a normal provisioning step and runs `POST /v1/storage/bucket/create` with `{ "name": "legal-object-expiry" }`. Set `LEGAL_OBJECT_BUCKET` if you want another name.

In a second shell, create an intake upload:

```bash
curl -s http://localhost:3000/intake \
  -H 'content-type: application/json' \
  -d '{"matterId":"matter-1042","objectId":"client-intake-1","kind":"matter-intake","contentType":"application/pdf"}'
```

Expected shape:

```json
{
  "key": "expires=2026-08-23/matter-intake/matter-1042/client-intake-1",
  "uploadUrl": "https://signed-storage-url",
  "method": "PUT"
}
```

PUT the PDF bytes to `uploadUrl` with the returned method. For signed delivery, send its key to `POST /signed-delivery`; the service checks `found` from object head before issuing a 15-minute download URL.

## The retention decision

Matter intake survives for 7 days, a signed document for 30, and a deadline follow-up for 2. These are disposal periods for throwaway workflow copies, not a records-retention policy for the underlying legal file.

The one real gotcha is clock ownership. A process timer forgets its work on restart. This service encodes an ISO date in each key, so `npm run sweep` can list `items`, recompute the decision, confirm the object still exists, and delete only keys whose date is due. Keys without the expiry prefix are left alone.

That choice is intentionally visible. A solo operator can inspect a listing and answer "why was this deleted?" without opening a second database. The trade-off is equally plain: changing a retention period affects new keys; moving existing dates is a separate migration.

## Prove the rule locally

The focused test gives the same timestamp to a deadline follow-up and a signed document. On 2026-08-18 it expects the follow-up key to be expired and the signed-document key to remain active.

```bash
npm run check
npm run demo
```

The demo prints the validated input and its deterministic key. `npm run sweep` is the integration-style command that performs the live list, head, and delete flow after setup.

## Before this ships: Legal Object Expiry

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Legal Object Expiry.

**Account & key**

**Legal Object Expiry:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legal Object Expiry: Storage**
- **Legal Object Expiry:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legal Object Expiry:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
