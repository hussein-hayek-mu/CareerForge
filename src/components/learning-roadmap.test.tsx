import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningRoadmap } from "./learning-roadmap";
import { emptyProfile } from "@/lib/account/schemas";
import { jobs } from "@/lib/demo-workspace";
const catalog = jobs.map(job => ({ ...job, isActive: true, isFictional: true }));

test("roadmap requires an explicit target and never assumes a role for a new profile", () => {
  const html = renderToStaticMarkup(<LearningRoadmap profile={emptyProfile} jobs={catalog} />);
  assert.ok(html.includes("Select a role above"));
  assert.ok(html.includes("no skills yet"));
  assert.equal(html.includes("Ready for review when"), false);
});

test("roadmap renders grounded exercises, original-source links and evidence limitations", () => {
  const html = renderToStaticMarkup(<LearningRoadmap profile={{ ...emptyProfile, skills: ["React", "CSS", "Git"] }} jobs={catalog} targetId="1" />);
  assert.ok(html.includes("1 skill gap"));
  assert.ok(html.includes("https://roadmap.sh/typescript"));
  assert.ok(html.includes("Ready for review when"));
  assert.ok(html.includes("does not verify a skill"));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.equal(html.includes("https://roadmap.sh/react"), false);
});

test("covered, empty-catalog and invalid-target states are explicit and safe", () => {
  const covered = renderToStaticMarkup(<LearningRoadmap profile={{ ...emptyProfile, skills: jobs[0].skills }} jobs={catalog} targetId="1" />);
  assert.ok(covered.includes("No missing skills"));
  assert.ok(covered.includes("not proof of proficiency"));
  const empty = renderToStaticMarkup(<LearningRoadmap profile={emptyProfile} jobs={[]} />);
  assert.ok(empty.includes("No practice roles"));
  const invalid = renderToStaticMarkup(<LearningRoadmap profile={emptyProfile} jobs={catalog} targetId="<script>" />);
  assert.ok(invalid.includes("no longer available"));
  assert.equal(invalid.includes("<script>"), false);
});
