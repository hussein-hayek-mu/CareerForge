import { trackerHandlers } from "@/lib/tracker/handlers";
import { authorizeTracker } from "@/lib/tracker/server";
const handlers = trackerHandlers(authorizeTracker);
type Context = { params: Promise<{ jobId: string }> };
export async function PATCH(request: Request, context: Context) { return handlers.PATCH(request, (await context.params).jobId); }
export async function DELETE(request: Request, context: Context) { return handlers.DELETE(request, (await context.params).jobId); }
