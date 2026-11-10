import { profileHistoryHandlers } from "@/lib/profile-history-handlers";
import { authorizeHistory } from "@/lib/profile-history-server";

export const { GET, POST } = profileHistoryHandlers("education", authorizeHistory);
