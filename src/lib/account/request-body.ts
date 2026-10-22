// Count bytes while reading, rather than buffering an unbounded request first.
// Invalid, truncated and oversized JSON all follow the handlers' input-error path.
export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!request.body) return null;
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    void request.body.cancel().catch(() => {});
    return null;
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch {
    void reader.cancel().catch(() => {});
    return null;
  } finally { reader.releaseLock(); }
}
