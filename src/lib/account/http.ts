export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", Vary: "Cookie, Authorization" } });
}
export function failure(code: string, message: string, status: number) {
  return json({ error: { code, message } }, status);
}
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  // Next's internal URL can use 0.0.0.0 when listening on the LAN. The browser
  // sends the actual destination in Host, including a phone's LAN address.
  const host = request.headers.get("host");
  if (host) url.host = host;
  const protocol = request.headers.get("x-forwarded-proto");
  if (protocol === "http" || protocol === "https") url.protocol = `${protocol}:`;
  return url.origin;
}
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Browser mutations must originate from this app, including phone LAN URLs.
  // Non-browser callers without Origin still need valid credentials/session.
  return !origin || origin === requestOrigin(request);
}
