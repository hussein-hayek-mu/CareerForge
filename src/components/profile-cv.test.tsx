import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileCV } from "./profile-cv";
import { emptyProfile } from "@/lib/account/schemas";

test("CV uses only supplied profile content and omits empty sections", () => {
  const html = renderToStaticMarkup(<ProfileCV profile={{ ...emptyProfile, name: "Owner", skills: ["React", "TypeScript"] }} passedSkills={["React", "SQL"]} />);
  assert.ok(html.includes("Owner") && html.includes("React"));
  assert.equal(html.includes("TypeScript"), false);
  assert.equal(html.includes("SQL"), false);
  for (const text of ["Education", "Featured project", "Work experience", "Harvard", "Verified"]) assert.equal(html.includes(text), false);
});

test("CV escapes applicant text instead of rendering injected markup", () => {
  const html = renderToStaticMarkup(<ProfileCV profile={{ ...emptyProfile, name: "<script>alert(1)</script>", bio: "<img src=x onerror=alert(1)>", education: "My education", project: "My own project" }} />);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes("&lt;script&gt;") && html.includes("My education") && html.includes("My own project"));
});
