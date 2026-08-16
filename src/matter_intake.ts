import { createServer } from "node:http";
import { ZodError, z } from "zod";
import { InfraiError, infrai } from "./infrai_storage.js";
import { legalObjectSchema, objectKey } from "./retention_policy.js";
import { BUCKET } from "./storage_setup.js";

const deliverySchema = z.object({ key: z.string().min(1).max(500) });

async function jsonBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function clientStatus(error: InfraiError): number {
  return error.status >= 400 && error.status < 500 ? error.status : 502;
}

export const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/intake") {
      const input = legalObjectSchema.parse(await jsonBody(request));
      const key = objectKey(input, new Date());
      const signed = await infrai.storage.object.presign(BUCKET, key, {
        op: "put",
        expires_seconds: 600,
        content_type: input.contentType,
        max_bytes: 10_000_000,
        idempotency_key: `upload-${input.objectId}`,
      });
      reply(response, 201, { key, uploadUrl: signed.url, method: signed.method });
      return;
    }
    if (request.method === "POST" && request.url === "/signed-delivery") {
      const input = deliverySchema.parse(await jsonBody(request));
      const object = await infrai.storage.object.head(BUCKET, input.key);
      if (!object.found) {
        reply(response, 404, { error: "document_not_found" });
        return;
      }
      const signed = await infrai.storage.object.presign(BUCKET, input.key, {
        op: "get",
        expires_seconds: 900,
        response_disposition: "attachment",
        idempotency_key: `delivery-${input.key}`,
      });
      reply(response, 200, { downloadUrl: signed.url, expiresSeconds: 900 });
      return;
    }
    reply(response, 404, { error: "route_not_found" });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      reply(response, 400, { error: "invalid_request" });
    } else if (error instanceof InfraiError) {
      reply(response, clientStatus(error), { error: error.code, message: error.message });
    } else {
      reply(response, 500, { error: "service_error" });
    }
  }
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Legal object service listening on http://localhost:${port}`));
}
