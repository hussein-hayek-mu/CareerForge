import "server-only";
import { createClient } from "./supabase/server";

export async function authorizeDocumentDemo(): Promise<boolean> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    if (error.status === 400 || error.status === 401 || error.name === "AuthSessionMissingError") return false;
    throw new Error("Session verification unavailable");
  }
  return !!user;
}
