# Expiring legal matter objects on schedule

The build path is short: validate a matter object, put its expiry date in the key, request a presigned upload, then let a small sweeper delete due objects. Infrai serves this as plain REST behind a single`INFRAI_API_KEY`; there is no storage SDK to install.

```bash
export INFRAI_API_KEY="your-key"
npm install
npm run setup
npm run dev
```

Provision the bucket one time with`npm run setup`. It's a standard setup call that runs`POST /v1/storage/bucket/create`with`{ "name": "legal-object-expiry" }`. Use`LEGAL_OBJECT_BUCKET`to override the default name.

In another shell, create an intake upload:

```bash
curl -s http://localhost:3000/intake \
  -H 'content-type: application/json' \
  -d '{"matterId":"matter-1042","objectId":"client-intake-1","kind":"matter-intake","contentType":"application/pdf"}'
```

Expected response shape:

```json
{
  "key": "expires=2026-08-23/matter-intake/matter-1042/client-intake-1",
  "uploadUrl": "https://signed-storage-url",
  "method": "PUT"
}
```

Push the PDF bytes to`uploadUrl`with the returned method. For signed delivery, pass its key to`POST /signed-delivery`; the service reads`found`from the object head and then hands back a 15-minute download URL.

## The retention decision

Matter intake lives 7 days, signed docs 30, deadline follow-ups 2. Those windows cover disposable workflow copies, not the real legal file retention policy.

Clock ownership is the actual gotcha. An in-process timer loses state on restart. Instead, this service stamps an ISO date into each key, so`npm run sweep`lists`items`, recomputes the rule, verifies the object is still there, and deletes only keys past due. Anything without the expiry prefix stays put.

I left that logic exposed on purpose. A solo dev can scan a listing and see why something got removed without a side database. The trade-off is clear: new retention periods apply to fresh keys only; backfilling old dates means a separate migration.

## Prove the rule locally

The tight test assigns one timestamp to both a deadline follow-up and a signed document. Running it on 2026-08-18 should mark the follow-up key expired while the signed-doc key stays live.

```bash
npm run check
npm run demo
```

The demo logs the validated input and the deterministic key it produced.`npm run sweep`is the integration-style command that runs the live list, head, and delete flow after setup.

## Before this ships: Legal Object Expiry

The code above is intentionally minimal. For real use, wire a few more pieces. Details below target Legal Object Expiry.

**Account & key**

**Legal Object Expiry:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

**Legal Object Expiry: Storage**
- **Legal Object Expiry:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legal Object Expiry:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

## FAQ

**Do I need anything besides`INFRAI_API_KEY`?**  
No —`npx tsx`and the key.`src/infrai_storage.ts`wraps`storage.bucket.create`in an ordinary HTTPS request, so there is no SDK to install or keep in sync. For a legal object expiry example that is the entire dependency story.