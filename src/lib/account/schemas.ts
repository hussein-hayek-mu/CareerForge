import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email().max(254).transform(email => email.trim().toLowerCase()),
  password: z.string().min(8).max(128)
}).strict();

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  headline: z.string().trim().max(160),
  location: z.string().trim().max(120),
  bio: z.string().trim().max(1000),
  education: z.string().trim().max(240),
  project: z.string().trim().max(1000),
  skills: z.array(z.string().trim().min(1).max(60)).max(40)
    .transform(skills => [...new Map(skills.map(skill => [skill.toLowerCase(), skill])).values()])
}).strict();

export type AccountProfile = z.infer<typeof profileSchema>;
export const emptyProfile: AccountProfile = { name: "", headline: "", location: "", bio: "", education: "", project: "", skills: [] };

export const profileRowSchema = z.object({
  full_name: z.string(), headline: z.string(), location: z.string(), bio: z.string(),
  education_summary: z.string(), project_summary: z.string(), self_reported_skills: z.array(z.string())
});

export function profileFromRow(row: unknown): AccountProfile {
  const parsed = profileRowSchema.parse(row);
  return { name: parsed.full_name, headline: parsed.headline, location: parsed.location, bio: parsed.bio,
    education: parsed.education_summary, project: parsed.project_summary, skills: parsed.self_reported_skills };
}

export function profileToRow(profile: AccountProfile) {
  return { full_name: profile.name, headline: profile.headline, location: profile.location, bio: profile.bio,
    education_summary: profile.education, project_summary: profile.project, self_reported_skills: profile.skills };
}
