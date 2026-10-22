export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", Vary: "Cookie, Authorization" } });
}
export function failure(code: string, message: string, status: number) {
  return json({ error: { code, message } }, status);
}
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  if (process.env.NODE_ENV === "production" || process.env.APP_ORIGIN) {
    const configured = process.env.APP_ORIGIN;
    if (!configured) throw new Error("Trusted application origin is not configured");
    const trusted = new URL(configured);
    if (trusted.protocol !== "https:" || trusted.username || trusted.password || trusted.pathname !== "/" || trusted.search || trusted.hash) throw new Error("Invalid application origin");
    // Forwarded host/protocol headers cannot choose auth destinations.
    const host = request.headers.get("host") ?? url.host;
    if (host.toLowerCase() !== trusted.host.toLowerCase()) throw new Error("Untrusted request host");
    return trusted.origin;
  }
  // Next's internal URL can use 0.0.0.0 when listening on the LAN. The browser
  // sends the actual destination in Host, including a phone's LAN address.
  const host = request.headers.get("host");
  if (host) url.host = host;
  const protocol = request.headers.get("x-forwarded-proto");
  if (protocol === "http" || protocol === "https") url.protocol = `${protocol}:`;
  return url.origin;
}
export function isSameOrigin(request: Request): boolean {
  // Browsers can omit Origin. Fetch Metadata still identifies foreign initiators.
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return false;
  const origin = request.headers.get("origin");
  // Browser mutations must originate from this app, including phone LAN URLs.
  // Non-browser callers without Origin still need valid credentials/session.
  try {
    const trusted = requestOrigin(request);
    return !origin || origin === trusted;
  } catch { return false; }
}
