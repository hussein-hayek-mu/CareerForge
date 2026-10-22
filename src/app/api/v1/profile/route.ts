import { profileHandlers } from "@/lib/account/profile-handlers";
import { authorizeProfile } from "@/lib/account/server";

export const { GET, PUT } = profileHandlers(authorizeProfile);
