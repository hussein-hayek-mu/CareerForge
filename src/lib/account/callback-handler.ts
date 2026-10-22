import { requestOrigin } from "./http";

type Exchange = (code: string, flowId?: string) => Promise<{ data: { redirectType?: string | null }; error: { code?: string } | null }>;
export function callbackHandler(exchange: Exchange) {
  return async (request: Request) => {
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    const flowId = params.get("sb_flow_id");
    let path = "/login?confirmation=failed";
    const validInput = params.getAll("code").length === 1 && params.getAll("sb_flow_id").length <= 1 && (!flowId || flowId.length <= 256);
    if (params.get("error_code") === "otp_expired" || params.get("error_code") === "flow_state_expired") path += "&reason=expired";
    if (code && code.length <= 2048 && validInput && !params.has("error") && !params.has("error_code")) {
      try {
        const result = await exchange(code, flowId || undefined);
        if (!result.error) path = result.data.redirectType === "recovery" ? "/reset-password" : "/account";
        else if (result.error.code === "flow_state_expired" || result.error.code === "otp_expired") path += "&reason=expired";
        else if (result.error.code === "pkce_code_verifier_not_found" || result.error.code === "flow_state_not_found") path += "&reason=browser";
      } catch { /* Never expose codes or provider errors. */ }
    }
    return new Response(null, { status: 303, headers: { Location: new URL(path, requestOrigin(request)).href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  };
}
