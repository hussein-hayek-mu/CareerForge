import { failure, isSameOrigin, json } from "./http";
import { profileSchema, type AccountProfile } from "./schemas";

export type ProfileAccess = {
  read: () => Promise<AccountProfile | null>;
  write: (profile: AccountProfile) => Promise<AccountProfile>;
};
export function profileHandlers(authorize: () => Promise<ProfileAccess | null>) {
  return {
    async GET() {
      try {
        const access = await authorize();
        if (!access) return failure("UNAUTHORIZED", "Sign in to view your profile.", 401);
        const profile = await access.read();
        if (!profile) return failure("PROFILE_NOT_READY", "Your profile is not available yet. Please try again.", 503);
        return json({ profile });
      } catch { return failure("PROFILE_UNAVAILABLE", "Your profile could not be loaded. Please try again.", 503); }
    },
    async PUT(request: Request) {
      if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
      try {
        const access = await authorize();
        if (!access) return failure("UNAUTHORIZED", "Sign in to update your profile.", 401);
        if (Number(request.headers.get("content-length")) > 16000) return failure("INVALID_INPUT", "Profile is too large.", 400);
        const result = profileSchema.safeParse(await request.json().catch(() => null));
        if (!result.success) return failure("INVALID_INPUT", "Check your profile fields. A name is required; use at most 40 skills of 60 characters each.", 400);
        return json({ profile: await access.write(result.data) });
      } catch { return failure("PROFILE_UNAVAILABLE", "Your profile could not be saved. Please try again.", 503); }
    }
  };
}
