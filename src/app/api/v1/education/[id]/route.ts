import { profileHistoryHandlers } from "@/lib/profile-history-handlers";
import { authorizeHistory } from "@/lib/profile-history-server";

const handlers = profileHistoryHandlers("education", authorizeHistory);
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  return handlers.PUT(request, (await context.params).id);
}
export async function DELETE(request: Request, context: Context) {
  return handlers.DELETE(request, (await context.params).id);
}
