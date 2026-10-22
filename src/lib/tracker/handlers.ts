import { failure, isSameOrigin, json } from "@/lib/account/http";
import { readBoundedJson } from "@/lib/account/request-body";
import { filtersSchema, jobIdSchema, revisionSchema, saveSchema, statusSchema, type TrackerEntry, type CatalogJob } from "./schemas";

export class TrackerError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
export type TrackerAccess = {
  jobs: () => Promise<CatalogJob[]>;
  list: () => Promise<TrackerEntry[]>;
  save: (id: string) => Promise<{ application: TrackerEntry; created: boolean }>;
  update: (id: string, revision: string, status: TrackerEntry["status"]) => Promise<TrackerEntry>;
  remove: (id: string, revision: string) => Promise<void>;
};
export function trackerHandlers(authorize: () => Promise<TrackerAccess | null>) {
  async function run(request: Request, action: (access: TrackerAccess) => Promise<Response>) {
    if (request.method !== "GET" && !isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
    try {
      const access = await authorize();
      if (!access) return failure("UNAUTHORIZED", "Sign in to access your saved opportunities.", 401);
      return await action(access);
    } catch (error) {
      if (error instanceof TrackerError) return failure(error.code, error.message, error.status);
      return failure("TRACKER_UNAVAILABLE", "Your opportunities could not be synchronized. Please retry.", 503);
    }
  }
  async function body(request: Request) {
    return readBoundedJson(request, 2048);
  }
  const invalid = () => failure("INVALID_INPUT", "Check the opportunity, status and revision, then try again.", 400);
  return {
    jobs: (request: Request) => run(request, async access => {
      const parsed = filtersSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      if (!parsed.success) return invalid();
      const search = parsed.data.search?.toLowerCase() ?? "";
      const jobs = (await access.jobs()).filter(job => (!parsed.data.mode || parsed.data.mode === job.mode) &&
        `${job.title} ${job.company} ${job.location} ${job.skills.join(" ")}`.toLowerCase().includes(search));
      return json({ jobs });
    }),
    GET: (request: Request) => run(request, async access => {
      if (new URL(request.url).search) return invalid();
      return json({ applications: await access.list() });
    }),
    POST: (request: Request) => run(request, async access => {
      const parsed = saveSchema.safeParse(await body(request));
      if (!parsed.success) return invalid();
      const result = await access.save(parsed.data.jobId);
      return json({ application: result.application }, result.created ? 201 : 200);
    }),
    PATCH: (request: Request, id: string) => run(request, async access => {
      const parsed = statusSchema.safeParse(await body(request));
      if (!jobIdSchema.safeParse(id).success || !parsed.success) return invalid();
      return json({ application: await access.update(id, parsed.data.revision, parsed.data.status) });
    }),
    DELETE: (request: Request, id: string) => run(request, async access => {
      const parsed = revisionSchema.safeParse(await body(request));
      if (!jobIdSchema.safeParse(id).success || !parsed.success) return invalid();
      await access.remove(id, parsed.data.revision);
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", Vary: "Cookie, Authorization" } });
    })
  };
}
