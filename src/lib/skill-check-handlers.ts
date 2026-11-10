import { z } from "zod";
import { failure, isSameOrigin, json } from "./account/http";
import { readBoundedJson } from "./account/request-body";
import { checkSubmission, sessionActionSchema, sessionReplySchema, submissionResultSchema } from "./skill-checks";

export type SkillCheckAccess = {
  start: (input: Extract<z.infer<typeof sessionActionSchema>, { action: "start" }>) => Promise<unknown>;
  cancel: (sessionId: string) => Promise<unknown>;
  submit: (input: z.infer<typeof checkSubmission>) => Promise<unknown>;
};
const outcomeSchema = z.object({
  rateLimited: z.boolean().optional(), retryAfter: z.number().finite().optional(),
  expired: z.boolean().optional(), notFound: z.boolean().optional(),
  bankChanged: z.boolean().optional(), conflict: z.boolean().optional(),
  skillNotSelected: z.boolean().optional(), invalidInput: z.boolean().optional()
});
function outcome(value: unknown) {
  const parsed = outcomeSchema.safeParse(value);
  if (!parsed.success) return null;
  const data = parsed.data;
  if (data.rateLimited) {
    const response = failure("RATE_LIMITED", "Wait before starting or submitting another check. Your active deadline does not restart.", 429);
    response.headers.set("Retry-After", String(Math.min(60, Math.max(1, Math.ceil(data.retryAfter ?? 60)))));
    return response;
  }
  if (data.notFound) return failure("NOT_FOUND", "This attempt is unavailable. Reload to check your current attempt.", 404);
  if (data.expired) return failure("CHECK_EXPIRED", "This attempt has expired. No new grade was recorded. End the attempt and start again when ready.", 410);
  if (data.bankChanged) return failure("CHECK_CHANGED", "The questions changed. Reload before starting another attempt.", 409);
  if (data.conflict) return failure("CHECK_ACTIVE", "Another check is already running. Reload to resume it before starting a different skill.", 409);
  if (data.skillNotSelected) return failure("SKILL_NOT_SELECTED", "Add this skill to your saved profile before starting its check.", 400);
  if (data.invalidInput) return failure("INVALID_INPUT", "Check your answers and use the current attempt before submitting.", 400);
  return null;
}
const unavailable = () => failure("CHECK_UNAVAILABLE", "The operation could not be confirmed. Reload to check your recorded attempt before retrying.", 503);

export function skillCheckHandlers(authorize: () => Promise<SkillCheckAccess | null>) {
  return {
    async session(request: Request) {
      if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
      try {
        const access = await authorize();
        if (!access) return failure("UNAUTHORIZED", "Sign in to complete a skill check.", 401);
        const input = sessionActionSchema.safeParse(await readBoundedJson(request, 1024));
        if (!input.success) return failure("INVALID_INPUT", "Choose a supported skill and timing option.", 400);
        const data = input.data.action === "start" ? await access.start(input.data) : await access.cancel(input.data.sessionId);
        const error = outcome(data);
        if (error) return error;
        if (input.data.action === "cancel") {
          if (!z.object({ cancelled: z.literal(true) }).strict().safeParse(data).success) return unavailable();
          return json({ cancelled: true });
        }
        const result = sessionReplySchema.safeParse(data);
        if (!result.success || !result.data.session || result.data.session.skill !== input.data.skill || result.data.session.version !== input.data.version) return unavailable();
        return json(result.data);
      } catch { return unavailable(); }
    },
    async submit(request: Request) {
      if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
      try {
        const access = await authorize();
        if (!access) return failure("UNAUTHORIZED", "Sign in to complete a skill check.", 401);
        const input = checkSubmission.safeParse(await readBoundedJson(request, 2048));
        if (!input.success) return failure("INVALID_INPUT", "Answer each question in an active attempt before submitting.", 400);
        const data = await access.submit(input.data);
        const error = outcome(data);
        if (error) return error;
        const result = submissionResultSchema.safeParse(data);
        return result.success ? json({ result: result.data }) : unavailable();
      } catch { return unavailable(); }
    }
  };
}
