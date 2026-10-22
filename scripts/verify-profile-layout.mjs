import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function verifyProfileLayout(context) {
  const original = (await (await context.request.get("/api/v1/profile")).json()).profile;
  const page = await context.newPage();
  try {
    const fixture = { ...original, name: "W".repeat(100), headline: "Developer".repeat(17).slice(0, 160), location: "Location".repeat(15), bio: "B".repeat(1000), project: "P".repeat(1000), education: "E".repeat(240), skills: Array.from({ length: 40 }, (_, i) => `${i}-` + "S".repeat(57)) };
    assert.equal((await context.request.put("/api/v1/profile", { data: fixture })).status(), 200);
    const issues = [];
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/account");
      await expect(page.getByLabel("Full name")).toHaveValue(fixture.name);
      await expect(page.locator(".skill-tags .tag")).toHaveCount(40);
      const overflow = await page.evaluate(() => ({
        width: innerWidth, scroll: document.documentElement.scrollWidth,
        clipped: [...document.querySelectorAll(".identity-copy h2,.identity-copy > p,.identity-meta > span,.skill-tags .tag")]
          .filter(node => node.checkVisibility() && node.scrollWidth > node.clientWidth + 1)
          .map(node => `${node.tagName}.${node.className}`)
      }));
      if (overflow.scroll > overflow.width || overflow.clipped.length) issues.push(overflow);
      await page.screenshot({ path: `test-results/profile-stress-${width}.png`, fullPage: true, animations: "disabled" });
    }
    if (issues.length) console.error("Profile layout overflow measurements:", JSON.stringify(issues));
    assert.deepEqual(issues, [], "Maximum-length profile should not cause horizontal scrolling or clipped identity/skill text");
    console.log("PASS: maximum-length private profile and 40 long skills fit at 320, 768 and 1440 CSS pixels");
  } finally {
    const restored = await context.request.put("/api/v1/profile", { data: original });
    assert.equal(restored.status(), 200, "Restore original temporary profile");
    await page.close();
  }
}
