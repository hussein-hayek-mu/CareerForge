import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

test("unconfigured Supabase allows the scaffold to run without contacting auth", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    assert.fail("Unconfigured middleware must not make network requests");
  });

  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    for (const [url, key] of [
      [undefined, undefined],
      ["https://example.supabase.co", undefined],
      [undefined, "test-publishable-key"]
    ]) {
      if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;

      const request = new NextRequest("http://localhost:3000/");
      const response = await updateSession(request);

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(response.headers.get("location"), null);
      assert.deepEqual(response.cookies.getAll(), []);
    }
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});
