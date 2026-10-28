import "server-only";
import { createClient } from "./supabase/server";
import type { PortfolioAccess } from "./portfolio-handlers";

export async function authorizePortfolio(): Promise<PortfolioAccess | null> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    if (error.status === 400 || error.status === 401 || error.name === "AuthSessionMissingError") return null;
    throw new Error("Session verification unavailable");
  }
  if (!user) return null;
  async function rpc(name: string, params?: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, params);
    if (error) throw new Error("Portfolio operation unavailable");
    return data as unknown;
  }
  return { userId: user.id, read: () => rpc("get_portfolio"), write: input => rpc("put_portfolio", {
    p_action: input.action, p_revision: input.revision, p_template: input.template,
    p_sections: input.sections, p_source_token: input.sourceToken
  }) };
}
