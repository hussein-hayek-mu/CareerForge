import assert from "node:assert/strict";
import { test } from "node:test";
import { jobs } from "./demo-workspace";
import { buildLearningRoadmap } from "./learning-roadmap";

test("learning exercises trace only to missing role requirements in role order", () => {
  const plan = buildLearningRoadmap([" reactjs ", "SQL"], ["React", "TypeScript", "CSS", "Git", "git"]);
  assert.equal(plan.score, 25);
  assert.deepEqual(plan.steps.map(step => step.skill), ["TypeScript", "CSS", "git"]);
  assert.ok(plan.steps.every(step => step.task && step.doneWhen && step.topics));
  assert.equal(plan.steps[0].resource?.url, "https://roadmap.sh/typescript");
});

test("empty and fully covered requirements never fabricate gaps or completion evidence", () => {
  assert.deepEqual(buildLearningRoadmap([], []), { score: 0, missing: [], steps: [] });
  assert.equal(buildLearningRoadmap(["js", "nodejs"], ["JavaScript", "Node.js"]).steps.length, 0);
  assert.equal(buildLearningRoadmap([], [" "]).steps.length, 0);
});

test("every seeded requirement has a concrete exercise; unknown skills get an honest fallback", () => {
  for (const job of jobs) {
    for (const step of buildLearningRoadmap([], job.skills).steps) {
      assert.ok(step.task.length > 30 && step.doneWhen.length > 30);
      if (step.resource) assert.equal(new URL(step.resource.url).origin, "https://roadmap.sh");
    }
  }
  const [unknown] = buildLearningRoadmap([], ["Uncatalogued skill"]).steps;
  assert.equal(unknown.resource, null);
  assert.ok(unknown.task.includes("Uncatalogued skill"));
  for (const skill of ["__proto__", "constructor", "toString"]) {
    const [step] = buildLearningRoadmap([], [skill]).steps;
    assert.equal(step.resource, null);
    assert.ok(step.task.includes(skill));
  }
});
