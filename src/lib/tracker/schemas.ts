import { z } from "zod";
import { statuses, type Job } from "@/lib/demo-workspace";

export const jobIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const saveSchema = z.object({ jobId: jobIdSchema }).strict();
export const revisionSchema = z.object({ revision: z.uuid() }).strict();
export const statusSchema = revisionSchema.extend({ status: z.enum(statuses) });
export const filtersSchema = z.object({ search: z.string().max(160).optional(), mode: z.enum(["Remote", "Hybrid", "On-site"]).optional() }).strict();

export type CatalogJob = Job & { isActive: boolean; isFictional: boolean };
export type TrackerEntry = { jobId: string; status: (typeof statuses)[number]; revision: string; createdAt: string; updatedAt: string; job: CatalogJob };
export type TrackerData = { jobs: CatalogJob[]; applications: TrackerEntry[] };

const jobRow = z.object({
  id: jobIdSchema, title: z.string(), company: z.string(), initials: z.string(), location: z.string(),
  work_mode: z.string(), employment_type: z.string(), skills: z.array(z.string()), description: z.string(),
  color: z.string(), is_active: z.boolean(), is_fictional: z.boolean()
});
export function catalogJob(row: unknown): CatalogJob {
  const j = jobRow.parse(row);
  return { id: j.id, title: j.title, company: j.company, initials: j.initials, location: j.location,
    mode: j.work_mode, type: j.employment_type, skills: j.skills, description: j.description,
    color: j.color, isActive: j.is_active, isFictional: j.is_fictional };
}
export function trackerEntry(row: unknown): TrackerEntry {
  const r = z.object({ job_id: jobIdSchema, status: z.enum(statuses), revision: z.uuid(), created_at: z.string(), updated_at: z.string(), job: jobRow }).parse(row);
  return { jobId: r.job_id, status: r.status, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at, job: catalogJob(r.job) };
}
