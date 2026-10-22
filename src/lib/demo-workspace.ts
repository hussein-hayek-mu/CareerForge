export const statuses = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;
export type ApplicationStatus = (typeof statuses)[number];
export type DemoProfile = { name: string; headline: string; location: string; bio: string; education: string; project: string; skills: string[] };
export type Workspace = { profile: DemoProfile; applications: Record<string, ApplicationStatus> };
export type Job = { id: string; title: string; company: string; initials: string; location: string; mode: string; type: string; skills: string[]; description: string; color: string };

export const jobs: Job[] = [
  { id: "1", title: "Junior Frontend Developer", company: "Forma Studio", initials: "F", location: "Beirut, Lebanon", mode: "Hybrid", type: "Full-time", skills: ["React", "TypeScript", "CSS", "Git"], description: "Build thoughtful, accessible interfaces with a small product team. Collaborate with designers and turn early ideas into useful web experiences.", color: "peach" },
  { id: "2", title: "Software Engineering Intern", company: "Orbit Labs", initials: "O", location: "Remote", mode: "Remote", type: "Internship", skills: ["JavaScript", "Git", "Python"], description: "Learn by shipping. Work alongside experienced engineers on internal tools, write tests, and get regular feedback on your code.", color: "lilac" },
  { id: "3", title: "Junior Full Stack Developer", company: "Cedar Digital", initials: "C", location: "Beirut, Lebanon", mode: "On-site", type: "Full-time", skills: ["React", "TypeScript", "SQL", "Node.js", "Git"], description: "Help a growing team build reliable web applications, from customer-facing pages to database-backed services.", color: "mint" },
  { id: "4", title: "Data Analyst Intern", company: "Metric House", initials: "M", location: "Remote", mode: "Remote", type: "Internship", skills: ["Python", "SQL", "Excel"], description: "Explore datasets, prepare clear visual reports, and help teams answer practical questions with evidence.", color: "sand" },
  { id: "5", title: "UI Developer", company: "Outline", initials: "↗", location: "Dubai, UAE", mode: "Hybrid", type: "Full-time", skills: ["CSS", "JavaScript", "React", "Figma"], description: "Bring a design system to life through reusable components, responsive layouts, and careful attention to interaction details.", color: "blue" },
  { id: "6", title: "Backend Developer Intern", company: "Patchwork", initials: "P", location: "Remote", mode: "Remote", type: "Internship", skills: ["Node.js", "SQL", "Git", "Docker"], description: "Develop APIs and learn how dependable backend services are designed, tested, and maintained.", color: "pink" }
];

export const initialWorkspace: Workspace = {
  profile: { name: "Alex Morgan", headline: "Computer science student · Future frontend developer", location: "Beirut, Lebanon", bio: "I enjoy turning ideas into simple, useful web experiences. Currently building my portfolio and looking for my first opportunity.", education: "BSc Computer Science · Class of 2027", project: "Campus Connect — a student events web app built with React.", skills: ["React", "JavaScript", "CSS", "Git"] },
  applications: {}
};

export function normalizeSkill(skill: string): string {
  const normalized = skill.trim().toLowerCase();
  const aliases = new Map([["js", "javascript"], ["ts", "typescript"], ["reactjs", "react"], ["nodejs", "node.js"]]);
  return aliases.get(normalized) ?? normalized;
}

export function matchSkills(profileSkills: string[], requiredSkills: string[]) {
  const owned = new Set(profileSkills.map(normalizeSkill));
  const required = [...new Map(requiredSkills.filter(s => s.trim()).map(s => [normalizeSkill(s), s])).values()];
  const missing = required.filter(skill => !owned.has(normalizeSkill(skill)));
  return { score: required.length ? Math.round((required.length - missing.length) / required.length * 100) : 0, missing };
}

export function readWorkspace(raw: string | null): Workspace {
  if (!raw) return initialWorkspace;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || !("profile" in data) || !("applications" in data)) return initialWorkspace;
    const p = data.profile;
    if (!p || typeof p !== "object") return initialWorkspace;
    const fields = p as Record<string, unknown>;
    for (const key of ["name", "headline", "location", "bio", "education", "project"] as const) {
      if (typeof fields[key] !== "string") return initialWorkspace;
    }
    if (!("skills" in p) || !Array.isArray(p.skills) || !p.skills.every(s => typeof s === "string")) return initialWorkspace;
    const applications: Record<string, ApplicationStatus> = {};
    if (data.applications && typeof data.applications === "object") {
      for (const [id, status] of Object.entries(data.applications)) {
        if (jobs.some(j => j.id === id) && statuses.some(s => s === status)) applications[id] = status as ApplicationStatus;
      }
    }
    return { profile: p as DemoProfile, applications };
  } catch { return initialWorkspace; }
}
