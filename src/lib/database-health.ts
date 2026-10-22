import { json } from "./account/http";

// A public production request must not trigger a privileged database query.
export function databaseHealthHandler(check: () => Promise<unknown>, enabled = () => process.env.NODE_ENV !== "production") {
  return async () => {
    if (!enabled()) return json({ error: { code: "NOT_FOUND", message: "Not found." } }, 404);
    try {
      await check();
      return json({ status: "ok", database: "connected" });
    } catch { return json({ status: "error", database: "unavailable" }, 503); }
  };
}
