import { test } from "node:test";
import assert from "node:assert/strict";
import { eligibleCVSkills, checkSubmission, bankSchema, submissionResultSchema, type CheckResult } from "./skill-checks";
const result: CheckResult = { skill: "React", version: 1, score: 4, passed: true, taken_at: "2026-10-23" };
test("CV requires selected skills and a passing current supported check", () => {
  assert.deepEqual(eligibleCVSkills(["react", "SQL", "TypeScript"], [result]), ["react"]);
  for (const change of [{ passed: false }, { version: 0 }, { skill: "TypeScript" }]) assert.deepEqual(eligibleCVSkills(["React", "TypeScript"], [{ ...result, ...change }]), []);
  assert.deepEqual(eligibleCVSkills(["SQL"], [result]), []);
});
test("submissions cannot supply a pass or score and require a complete answer set", () => {
  const input = { skill: "React", version: 1, answers: { r1: 0, r2: 1, r3: 2, r4: 0, r5: 1 } };
  assert.equal(checkSubmission.safeParse(input).success, true);
  for (const candidate of [{ ...input, score: 5 }, { ...input, passed: true }, { ...input, user_id: "other" }, { ...input, version: 2 }, { ...input, answers: {} }]) assert.equal(checkSubmission.safeParse(candidate).success, false);
});
test("client bank schema rejects answer keys", () => {
  const questions = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, prompt: "Question", options: ["A", "B", "C"], answer: 1 }));
  assert.equal(bankSchema.safeParse([{ skill: "React", version: 1, questions }]).success, false);
});

test("a saved assessment result must have consistent bounded grading and provenance", () => {
  const saved = { skill: "React", version: 1, score: 4, total: 5, passed: true, takenAt: "2026-10-28T10:00:00+00:00" };
  assert.equal(submissionResultSchema.safeParse(saved).success, true);
  assert.equal(submissionResultSchema.safeParse({ ...saved, score: 2, passed: false }).success, true);
  for (const change of [{ score: 3 }, { passed: false }, { total: 10 }, { score: 6 }, { score: 4.5 }, { version: 2 }, { skill: "Unknown" }, { takenAt: "yesterday" }]) {
    assert.equal(submissionResultSchema.safeParse({ ...saved, ...change }).success, false);
  }
});
