import { requestOrigin } from "./http";

type Exchange = (code: string, flowId?: string) => Promise<{ data: { redirectType?: string | null }; error: { code?: string } | null }>;
export function callbackHandler(exchange: Exchange) {
  return async (request: Request) => {
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    let path = "/login?confirmation=failed";
    if (code && code.length <= 2048 && !params.has("error")) {
      try {
        const result = await exchange(code, params.get("sb_flow_id") ?? undefined);
        if (!result.error) path = result.data.redirectType === "recovery" ? "/reset-password" : "/account";
        else if (result.error.code === "flow_state_expired" || result.error.code === "otp_expired") path += "&reason=expired";
        else if (result.error.code === "pkce_code_verifier_not_found" || result.error.code === "flow_state_not_found") path += "&reason=browser";
      } catch { /* Never expose codes or provider errors. */ }
    }
    return new Response(null, { status: 303, headers: { Location: new URL(path, requestOrigin(request)).href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  };
}
