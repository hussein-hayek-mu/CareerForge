import { skillCheckHandlers } from "@/lib/skill-check-handlers";
import { authorizeSkillChecks } from "@/lib/skill-check-server";
export const POST = skillCheckHandlers(authorizeSkillChecks).submit;