import { z } from "zod";

export const portfolioSections = ["about", "project", "skills", "education", "location"] as const;
export const templateSchema = z.enum(["studio", "editorial"]);
export const sectionsSchema = z.array(z.enum(portfolioSections)).max(5).refine(items => new Set(items).size === items.length);
export const portfolioProfileSchema = z.object({
  name: z.string().max(100), headline: z.string().max(160), location: z.string().max(120),
  bio: z.string().max(1000), education: z.string().max(240), project: z.string().max(1000),
  skills: z.array(z.string().max(60)).max(40)
}).strict();
export const snapshotSchema = z.object({ template: templateSchema, profile: portfolioProfileSchema }).strict();
export const portfolioDataSchema = z.object({
  source: portfolioProfileSchema,
  sourceToken: z.string().regex(/^[a-f0-9]{32}$/),
  settings: z.object({ template: templateSchema, sections: sectionsSchema, revision: z.uuid().nullable(),
    isPublic: z.boolean(), slug: z.uuid().nullable(), publishedAt: z.iso.datetime({ offset: true }).nullable() }).strict()
}).strict();
export const portfolioWriteSchema = z.object({
  action: z.enum(["save", "publish", "unpublish"]), revision: z.uuid().nullable(),
  template: templateSchema, sections: sectionsSchema, sourceToken: z.string().regex(/^[a-f0-9]{32}$/)
}).strict();
export const publishedPortfolioSchema = z.object({ snapshot: snapshotSchema, publishedAt: z.iso.datetime({ offset: true }) }).strict();
export type PortfolioData = z.infer<typeof portfolioDataSchema>;
export type PortfolioWrite = z.infer<typeof portfolioWriteSchema>;
export type PortfolioSnapshot = z.infer<typeof snapshotSchema>;
export type PortfolioSection = (typeof portfolioSections)[number];

/** The server independently composes the same whitelist before publication. */
export function composePortfolio(source: PortfolioData["source"], template: PortfolioSnapshot["template"], sections: readonly PortfolioSection[]): PortfolioSnapshot {
  return { template, profile: {
    name: source.name, headline: source.headline,
    location: sections.includes("location") ? source.location : "",
    bio: sections.includes("about") ? source.bio : "",
    education: sections.includes("education") ? source.education : "",
    project: sections.includes("project") ? source.project : "",
    skills: sections.includes("skills") ? [...source.skills] : []
  } };
}
