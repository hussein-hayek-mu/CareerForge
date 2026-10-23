import { createClient } from "@/lib/supabase/server";
import { failure, isSameOrigin, json } from "@/lib/account/http";
import { readBoundedJson } from "@/lib/account/request-body";
import { checkSubmission } from "@/lib/skill-checks";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return failure("UNAUTHORIZED", "Sign in to complete a skill check.", 401);
    const input = checkSubmission.safeParse(await readBoundedJson(request, 2048));
    if (!input.success) return failure("INVALID_INPUT", "Answer each question before submitting.", 400);
    const { data, error: gradingError } = await client.rpc("submit_skill_check", { p_skill: input.data.skill, p_version: input.data.version, p_answers: input.data.answers });
    if (gradingError?.code === "22023") return failure("INVALID_INPUT", "This check changed. Reload and try again.", 400);
    if (gradingError) throw new Error("Grading unavailable");
    if (data?.rateLimited) {
      const response = failure("RATE_LIMITED", "Wait one minute between skill-check submissions.", 429);
      response.headers.set("Retry-After", String(Math.max(1, Number(data.retryAfter) || 60)));
      return response;
    }
    return json({ result: data });
  } catch { return failure("CHECK_UNAVAILABLE", "Your check could not be saved. Your CV skills have not changed; please retry.", 503); }
}
