import { z } from "zod";
import { failure, isSameOrigin, json } from "./account/http";
import { readBoundedJson } from "./account/request-body";
import { privateWriteLimit } from "./account/attempt-limit";
import {
  educationFieldsSchema, experienceFieldsSchema, educationRecordSchema,
  experienceRecordSchema, historyLimits, type HistoryFields, type HistoryKind, type ProfileHistory
} from "./profile-history";

export class ProfileHistoryError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
export type HistoryAccess = {
  userId: string;
  readAll: () => Promise<ProfileHistory>;
  list: (kind: HistoryKind) => Promise<unknown>;
  create: (kind: HistoryKind, requestId: string, fields: HistoryFields) => Promise<{ record: unknown; created: boolean }>;
  update: (kind: HistoryKind, id: string, revision: string, fields: HistoryFields) => Promise<unknown>;
  remove: (kind: HistoryKind, id: string, revision: string) => Promise<void>;
};
const uuid = z.uuid();
const deleteSchema = z.object({ revision: uuid }).strict();
const objectSchema = z.record(z.string(), z.unknown());

export function profileHistoryHandlers(kind: HistoryKind, authorize: () => Promise<HistoryAccess | null>, limit = privateWriteLimit) {
  const fieldsSchema = kind === "education" ? educationFieldsSchema : experienceFieldsSchema;
  const recordSchema = kind === "education" ? educationRecordSchema : experienceRecordSchema;
  const invalid = () => failure("INVALID_INPUT", "Check the record fields, dates, GPA scale and revision, then try again.", 400);
  function limited(userId: string) {
    const wait = limit("history", userId);
    if (!wait) return null;
    const response = failure("RATE_LIMITED", "Too many profile history changes. Wait before trying again.", 429);
    response.headers.set("Retry-After", String(wait));
    return response;
  }
  async function run(request: Request, action: (access: HistoryAccess) => Promise<Response>) {
    if (request.method !== "GET" && !isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
    try {
      const access = await authorize();
      if (!access) return failure("UNAUTHORIZED", "Sign in to manage your private profile history.", 401);
      return await action(access);
    } catch (error) {
      if (error instanceof ProfileHistoryError) return failure(error.code, error.message, error.status);
      return failure("HISTORY_UNAVAILABLE", "Your profile history could not be confirmed. Reload the saved records before retrying an uncertain change; your form has not been cleared.", 503);
    }
  }
  return {
    GET: (request: Request) => run(request, async access => {
      if (new URL(request.url).search) return invalid();
      const records = z.array(recordSchema).max(historyLimits[kind]).parse(await access.list(kind));
      return json({ records });
    }),
    POST: (request: Request) => run(request, async access => {
      const input = objectSchema.safeParse(await readBoundedJson(request, 16384));
      if (!input.success) return invalid();
      const { requestId, ...fields } = input.data;
      const token = uuid.safeParse(requestId);
      const parsed = fieldsSchema.safeParse(fields);
      if (!token.success || !parsed.success) return invalid();
      const denied = limited(access.userId);
      if (denied) return denied;
      const result = await access.create(kind, token.data, parsed.data);
      return json({ record: recordSchema.parse(result.record), created: result.created }, result.created ? 201 : 200);
    }),
    PUT: (request: Request, id: string) => run(request, async access => {
      const input = objectSchema.safeParse(await readBoundedJson(request, 16384));
      if (!input.success || !uuid.safeParse(id).success) return invalid();
      const { revision, ...fields } = input.data;
      const token = uuid.safeParse(revision);
      const parsed = fieldsSchema.safeParse(fields);
      if (!token.success || !parsed.success) return invalid();
      const denied = limited(access.userId);
      if (denied) return denied;
      return json({ record: recordSchema.parse(await access.update(kind, id, token.data, parsed.data)) });
    }),
    DELETE: (request: Request, id: string) => run(request, async access => {
      const input = deleteSchema.safeParse(await readBoundedJson(request, 1024));
      if (!input.success || !uuid.safeParse(id).success) return invalid();
      const denied = limited(access.userId);
      if (denied) return denied;
      await access.remove(kind, id, input.data.revision);
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", Vary: "Cookie, Authorization" } });
    })
  };
}
