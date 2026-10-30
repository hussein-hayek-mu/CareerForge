import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileCV } from "./profile-cv";
import { emptyProfile } from "@/lib/account/schemas";
import type { EducationRecord, ExperienceRecord, ProfileHistory } from "@/lib/profile-history";

const common = {
  id: "11111111-1111-4111-8111-111111111111", revision: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-10-29T10:00:00.000Z", updatedAt: "2026-10-29T10:00:00.000Z",
  evidenceStatus: "self_reported" as const, startDate: null, endDate: null, isCurrent: false
};
const education: EducationRecord = { ...common, institution: "Owner University", degree: "Computer Science", gpa: 3.75, gpaScale: 4 };
const experience: ExperienceRecord = { ...common, company: "Owner Employer", role: "Developer", description: "Built the owner's project." };
const history: ProfileHistory = { education: [education], experience: [experience] };

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

test("CV renders saved self-reported history while keeping summaries and assessed skills separate", () => {
  const html = renderToStaticMarkup(<ProfileCV profile={{ ...emptyProfile, name: "Owner", education: "Unparsed original education summary", project: "My original project summary", skills: ["React", "SQL"] }} passedSkills={["React"]} history={history} />);
  for (const text of ["Owner University", "Computer Science", "Owner Employer", "Developer", "Built the owner", "GPA: 3.75 / 4", "Education summary", "Unparsed original education summary", "Featured project summary", "My original project summary", "Self-reported; not independently verified."]) assert.ok(html.includes(text), text);
  assert.equal(html.includes("SQL"), false);
  assert.equal(html.includes("Present"), false);
  assert.ok(html.includes("Dates not provided"));
  assert.equal(html.includes("Verified credential"), false);
  assert.equal(html.includes("Employer confirmed"), false);
});

test("CV history escapes every user field and displays only explicitly current dates", () => {
  const html = renderToStaticMarkup(<ProfileCV profile={{ ...emptyProfile, name: "Owner" }} history={{
    education: [{ ...education, institution: "<img src=x>", degree: "<script>degree</script>", gpa: null, gpaScale: null, startDate: "2024-09-01", isCurrent: true }],
    experience: [{ ...experience, company: "<iframe>company</iframe>", role: "<b>role</b>", description: "<script>work</script>", startDate: "2021-01-01", endDate: "2022-02-28" }]
  }} />);
  for (const tag of ["<img", "<script>", "<iframe>", "<b>"]) assert.equal(html.includes(tag), false);
  for (const text of ["&lt;img", "&lt;script&gt;degree", "&lt;iframe&gt;", "&lt;b&gt;", "Sep 2024 – Present", "Jan 2021 – Feb 2022"]) assert.ok(html.includes(text), text);
  assert.equal(html.includes("GPA:"), false);
});

test("CV omits empty saved-history sections and empty optional descriptions", () => {
  const html = renderToStaticMarkup(<ProfileCV profile={{ ...emptyProfile, name: "Owner" }} history={{ education: [], experience: [] }} />);
  assert.equal(html.includes("Work experience"), false);
  assert.equal(html.includes("Education history"), false);
  assert.equal(html.includes("Self-reported"), false);
  const withExperience = renderToStaticMarkup(<ProfileCV profile={{ ...emptyProfile, name: "Owner" }} history={{ education: [], experience: [{ ...experience, description: "" }] }} />);
  assert.equal(withExperience.includes("cv-history-description"), false);
});
