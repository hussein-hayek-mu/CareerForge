import { trackerHandlers } from "@/lib/tracker/handlers";
import { authorizeTracker } from "@/lib/tracker/server";
export const GET = trackerHandlers(authorizeTracker).jobs;
