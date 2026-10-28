import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioPreview } from "./portfolio-preview";
import { composePortfolio } from "@/lib/portfolio";
import { emptyProfile } from "@/lib/account/schemas";
test("portfolio omits unsupported sections and labels limited skill and profile evidence", () => {
  const html = renderToStaticMarkup(<PortfolioPreview snapshot={composePortfolio({ ...emptyProfile, name: "Owner", skills: ["React"], education: "My degree" }, "editorial", ["skills"])} />);
  assert.ok(html.includes("Owner") && html.includes("React") && html.includes("Basics check passed"));
  assert.ok(html.includes("self-reported") && html.includes("not establish identity"));
  for (const text of ["My degree", "Certifications", "Contact", "Experience", "Alex Morgan"]) assert.equal(html.includes(text), false);
});
test("portfolio renders source text safely, with no injected script/link or fabricated facts", () => {
  const html = renderToStaticMarkup(<PortfolioPreview snapshot={composePortfolio({ ...emptyProfile, name: "<script>alert(1)</script>", project: "<a href='javascript:bad'>x</a>" }, "studio", ["project"])} publishedAt="2026-10-28T10:00:00Z" />);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<a href"), false);
  assert.ok(html.includes("&lt;script&gt;") && html.includes("2026-10-28"));
});
