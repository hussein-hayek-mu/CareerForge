/** Product navigation and report traceability. Status describes functionality, not page existence. */
export type FeatureIcon = "overview" | "profile" | "checks" | "jobs" | "applications" | "cv" | "compass" | "courses" | "roadmap" | "projects" | "analysis" | "portfolio" | "agent" | "outcomes" | "assistant" | "simulator";
export type FeatureStatus = "Available" | "Pilot" | "Planned" | "Stretch";
export type Feature = {
  id: string; label: string; href: string; icon: FeatureIcon; group: string;
  module: string; status: FeatureStatus; description: string;
};
export const featureGroups = ["Workspace", "Career", "Learning", "Documents", "Applications", "Explore"] as const;
export const features: readonly Feature[] = [
  { id: "overview", label: "Overview", href: "/", icon: "overview", group: "Workspace", module: "Workspace", status: "Available", description: "Your saved profile, skill matches and tracked roles in one place." },
  { id: "profile", label: "My profile", href: "/account", icon: "profile", group: "Workspace", module: "M1", status: "Available", description: "Edit your private profile summary and self-reported skills. Detailed history and preferences remain planned." },
  { id: "career-analysis", label: "Career analysis", href: "/career-analysis", icon: "compass", group: "Career", module: "M2", status: "Planned", description: "Find a career direction and understand the skills to build next." },
  { id: "skill-checks", label: "Skill checks", href: "/skill-checks", icon: "checks", group: "Career", module: "Assessment pilot", status: "Pilot", description: "React and SQL fundamentals checks. Only selected skills with a current passing check enter your CV." },
  { id: "academic-planner", label: "Academic planner", href: "/academic-planner", icon: "courses", group: "Learning", module: "M3", status: "Planned", description: "Connect your courses and degree progress to your career target." },
  { id: "learning-roadmap", label: "Learning roadmap", href: "/learning-roadmap", icon: "roadmap", group: "Learning", module: "M5 pilot", status: "Pilot", description: "Choose a fictional role for concrete gap-based exercises and roadmap.sh links. Saved schedules and progress remain planned." },
  { id: "projects", label: "Project ideas", href: "/projects", icon: "projects", group: "Learning", module: "M5", status: "Planned", description: "Build projects that demonstrate the skills your target career needs." },
  { id: "cv", label: "My CV", href: "/cv", icon: "cv", group: "Documents", module: "M6", status: "Available", description: "Edit a sample in the CV and portfolio builder, or open your saved-profile CV. AI generation and saved builder drafts are not connected." },
  { id: "cv-analysis", label: "CV analysis", href: "/cv-analysis", icon: "analysis", group: "Documents", module: "M6", status: "Planned", description: "Understand how your CV meets a specific job's requirements." },
  { id: "portfolio", label: "My portfolio", href: "/portfolio", icon: "portfolio", group: "Documents", module: "M6 pilot", status: "Pilot", description: "Try the sample portfolio builder. Manage publication separately to review, publish or revoke a saved-profile snapshot." },
  { id: "jobs", label: "Find opportunities", href: "/jobs", icon: "jobs", group: "Applications", module: "M4", status: "Available", description: "Browse fictional roles with transparent skill matching. Live job search is not connected." },
  { id: "applications", label: "Applications", href: "/applications", icon: "applications", group: "Applications", module: "M7", status: "Available", description: "Save roles and update application statuses manually in your private tracker." },
  { id: "application-agent", label: "Application agent", href: "/application-agent", icon: "agent", group: "Applications", module: "M7", status: "Planned", description: "Prepare grounded applications, review the contents and approve supported submissions." },
  { id: "application-insights", label: "Application insights", href: "/application-insights", icon: "outcomes", group: "Applications", module: "M7", status: "Planned", description: "Use your recorded application outcomes to guide your next steps." },
  { id: "career-assistant", label: "AI assistant", href: "/career-assistant", icon: "assistant", group: "Explore", module: "M9", status: "Stretch", description: "Ask career questions with context from your own profile." },
  { id: "graduation-simulator", label: "Graduation simulator", href: "/graduation-simulator", icon: "simulator", group: "Explore", module: "M8", status: "Stretch", description: "Explore how course delays could affect your graduation plan." },
];
export type PlannedFeature = Feature & { steps: readonly [string, string, string]; prerequisite: string; startHref: string; startLabel: string };
const plans: Record<string, Pick<PlannedFeature, "steps" | "prerequisite" | "startHref" | "startLabel">> = {
  "career-analysis": { steps: ["Choose a target career and its requirements.", "Compute ranked matches and Critical, Important or Optional skill gaps.", "Save results and explain the evidence behind each score."], prerequisite: "A richer profile and a maintained career/skill taxonomy are needed before personalized results can be produced.", startHref: "/account", startLabel: "Build your profile" },
  "academic-planner": { steps: ["Add courses, semesters, grades and credit requirements.", "Track completed credits and remaining degree requirements.", "Prioritize courses that support your chosen career."], prerequisite: "Course records, degree rules and a saved career target must be connected first.", startHref: "/account", startLabel: "Review your education" },
  "projects": { steps: ["Identify the skills you want to demonstrate.", "Recommend projects that cover several missing skills.", "Explain each recommendation and connect evidence to your profile."], prerequisite: "Career gaps and a reviewed project catalog must be connected first. No recommendations have been generated yet.", startHref: "/account", startLabel: "Review your projects" },
  "cv-analysis": { steps: ["Upload a private PDF or DOCX and select a target role.", "Compute compatibility from skills, experience, projects and education.", "Explain gaps and suggest improvements grounded in your records."], prerequisite: "Secure document storage, parsing and a deterministic scoring engine are required. Document upload is not available yet.", startHref: "/cv/saved", startLabel: "Open your current CV" },
  "application-agent": { steps: ["Check eligibility, exclusions, duplicates and application limits.", "Prepare a tailored CV, cover letter and form from your verified records.", "Review and approve each application before a supported submission."], prerequisite: "Versioned documents, grounding checks, policy controls and a controlled Mock ATS integration must pass verification first. No applications are submitted here.", startHref: "/applications", startLabel: "Open your tracker" },
  "application-insights": { steps: ["Use your recorded statuses and outcome timestamps.", "Compute transparent response and interview measures.", "Use the evidence to improve future matching and learning suggestions."], prerequisite: "Outcome history and sufficient real application records are needed. No interview rates or AI conclusions are fabricated.", startHref: "/applications", startLabel: "Update your tracker" },
  "career-assistant": { steps: ["Choose what profile context to include.", "Ask a career question using your own records.", "Receive a grounded answer with clear limitations."], prerequisite: "This is an M9 stretch feature after the core modules. A private, grounded conversation service is not connected.", startHref: "/account", startLabel: "Review your profile" },
  "graduation-simulator": { steps: ["Start from your courses and prerequisites.", "Model a delayed or failed course as a scenario.", "Compare the effect on your graduation timeline."], prerequisite: "This M8 stretch feature depends on the academic planner and validated prerequisite rules. No graduation date is predicted yet.", startHref: "/academic-planner", startLabel: "View academic planner scope" },
};
export const plannedFeatures: readonly PlannedFeature[] = features.filter(feature => feature.status === "Planned" || feature.status === "Stretch").map(feature => ({ ...feature, ...plans[feature.id] }));
export function getPlannedFeature(id: string): PlannedFeature {
  const feature = plannedFeatures.find(feature => feature.id === id);
  if (!feature) throw new Error("Unknown feature definition");
  return feature;
}
export function isPrivateFeaturePath(path: string): boolean {
  return path === "/features" || path.startsWith("/cv/") || path.startsWith("/portfolio/") || features.some(feature => feature.href === path);
}
