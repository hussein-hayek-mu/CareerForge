import { z } from "zod";
import { failure, isSameOrigin, json } from "./account/http";
import { readBoundedJson } from "./account/request-body";

const inputSchema = z.object({ text: z.string().trim().min(1).max(8000) }).strict();

/** No provider, persistence or profile writes: 501 enables the supplied UI's sample fallback. */
export function documentDemoHandlers(authorize: () => Promise<boolean>) {
  async function POST(request: Request) {
    if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
    try {
      if (!await authorize()) return failure("UNAUTHORIZED", "Sign in to use the document builder.", 401);
      const input = inputSchema.safeParse(await readBoundedJson(request, 65536));
      if (!input.success) return failure("INVALID_INPUT", "Enter between 1 and 8,000 characters of notes.", 400);
      return failure("NOT_IMPLEMENTED", "AI generation is not connected. The builder can show fictional sample content in demo mode.", 501);
    } catch {
      return failure("AUTH_UNAVAILABLE", "Your session could not be verified. Please try again.", 503);
    }
  }
  // The owner's unchanged component expects a string error at its original URL.
  // Keep that compatibility boundary outside the canonical v1 API contract.
  async function compatibilityPOST(request: Request) {
    const response = await POST(request);
    const body = await response.json() as { error: { code: string; message: string } };
    return json({ error: body.error.message }, response.status);
  }
  return { POST, compatibilityPOST };
}
