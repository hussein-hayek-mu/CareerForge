import { test } from "node:test";
import assert from "node:assert/strict";
import { composePortfolio, portfolioWriteSchema, snapshotSchema, type PortfolioData } from "./portfolio";
const source: PortfolioData["source"] = { name: "Owner", headline: "Student", location: "Private location", bio: "My own bio", education: "Self-reported degree", project: "My project", skills: ["React"] };
test("portfolio composition uses only selected source facts and leaves source unchanged", () => {
  const snapshot = composePortfolio(source, "studio", ["about", "skills"]);
  assert.deepEqual(snapshot.profile, { ...source, location: "", education: "", project: "" });
  snapshot.profile.skills.push("test");
  assert.deepEqual(source.skills, ["React"]);
  assert.equal(composePortfolio(source, "editorial", []).template, "editorial");
  assert.equal(composePortfolio(source, "editorial", []).profile.skills.length, 0);
});
test("portfolio writes cannot inject facts, visibility, owner or duplicate/unknown sections", () => {
  const input = { action: "publish", revision: null, template: "studio", sections: ["about"], sourceToken: "a".repeat(32) };
  assert.equal(portfolioWriteSchema.safeParse(input).success, true);
  for (const change of [{ userId: "other" }, { snapshot: source }, { isPublic: true }, { template: "unknown" }, { sections: ["email"] }, { sections: ["skills", "skills"] }, { sourceToken: "bad" }, { revision: "bad" }]) {
    assert.equal(portfolioWriteSchema.safeParse({ ...input, ...change }).success, false);
  }
});

test("appearance presets are whitelisted and legacy snapshots have a readable light default", () => {
  const legacy = snapshotSchema.parse({ template: "studio", profile: source });
  assert.deepEqual(legacy.appearance, { palette: "chartreuse", mode: "light" });
  const modern = composePortfolio(source, "studio", ["about"], { palette: "indigo", mode: "dark" });
  assert.equal(modern.profile.bio, source.bio);
  assert.deepEqual(modern.appearance, { palette: "indigo", mode: "dark" });
  assert.equal(snapshotSchema.safeParse({ ...modern, appearance: { palette: "url(bad)", mode: "dark" } }).success, false);
  assert.equal(snapshotSchema.safeParse({ ...modern, appearance: { palette: "indigo", mode: "unknown" } }).success, false);
});
