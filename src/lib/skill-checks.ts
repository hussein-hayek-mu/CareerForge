import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const checkSubmission = z.object({ skill: z.enum(["React", "SQL"]), version: z.literal(1), answers: z.record(z.string().max(8), z.number().int().min(0).max(2)).refine(value => Object.keys(value).length === 5) }).strict();
export const bankSchema = z.array(z.object({ skill: z.enum(["React", "SQL"]), version: z.literal(1), questions: z.array(z.object({ id: z.string(), prompt: z.string(), options: z.array(z.string()).length(3) }).strict()).length(5) }).strict());
export const resultSchema = z.object({ skill: z.string(), version: z.number(), score: z.number(), passed: z.boolean(), taken_at: z.string() });
export type SkillBank = z.infer<typeof bankSchema>[number];
export type CheckResult = z.infer<typeof resultSchema>;

export async function readSkillResults(client: SupabaseClient, userId: string) {
  const responses = await Promise.all(["React", "SQL"].map(skill => client.from("skill_check_attempts").select("skill,version,score,passed,taken_at").eq("user_id", userId).eq("skill", skill).eq("version", 1).eq("passed", true).order("taken_at", { ascending: false }).limit(1)));
  if (responses.some(response => response.error)) throw new Error("Skill checks unavailable");
  return z.array(resultSchema).parse(responses.flatMap(response => response.data ?? []));
}
export function eligibleCVSkills(skills: string[], results: CheckResult[]) {
  return skills.filter(skill => results.some(result => result.passed && result.version === 1 && ["React", "SQL"].includes(result.skill) && result.skill.toLowerCase() === skill.trim().toLowerCase()));
}
