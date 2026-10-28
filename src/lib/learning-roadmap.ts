import { matchSkills, normalizeSkill } from "./demo-workspace";

export type LearningExercise = {
  skill: string;
  topics: string;
  task: string;
  doneWhen: string;
  resource: { title: string; url: string } | null;
};

// Original CareerForge exercises. External resources are links, not imported
// roadmap content. Order follows the selected role's requirements, not a claim
// about market demand or an AI-generated priority score.
const exercises: Record<string, Omit<LearningExercise, "skill">> = {
  javascript: {
    topics: "Functions, arrays, DOM events and asynchronous requests",
    task: "Build a searchable list that loads JSON and shows loading, empty and error states.",
    doneWhen: "Search works without reloading; a failed request shows a retry action; explain how promises and event handlers work.",
    resource: { title: "JavaScript roadmap", url: "https://roadmap.sh/javascript" }
  },
  typescript: {
    topics: "Object types, unions, narrowing and strict checking",
    task: "Model a job listing and its loading, success and error states using a discriminated union.",
    doneWhen: "Strict type checking passes without any or unchecked casts; each state renders safely and unexpected input is validated.",
    resource: { title: "TypeScript roadmap", url: "https://roadmap.sh/typescript" }
  },
  react: {
    topics: "Components, state, stable keys and effect cleanup",
    task: "Build a filterable task board with add, edit and remove actions using immutable state updates.",
    doneWhen: "Editing one task preserves other tasks; reordering keeps input identity; keyboard users can operate every action.",
    resource: { title: "React roadmap", url: "https://roadmap.sh/react" }
  },
  css: {
    topics: "Grid, flexbox, responsive layout and visible focus",
    task: "Create a responsive job-card grid with a filter form and a clear keyboard focus style.",
    doneWhen: "At 320px and desktop widths there is no horizontal overflow; labels remain readable and all controls have visible focus.",
    resource: { title: "Frontend roadmap", url: "https://roadmap.sh/frontend" }
  },
  git: {
    topics: "Branches, commits, diffs and conflict resolution",
    task: "Make two feature branches that edit the same line, merge them and resolve the conflict deliberately.",
    doneWhen: "The final history contains both intended changes; explain the resolution and demonstrate reverting one commit.",
    resource: { title: "Git and GitHub roadmap", url: "https://roadmap.sh/git-github" }
  },
  sql: {
    topics: "Joins, grouping, constraints and parameterized queries",
    task: "Create learners, workshops and enrollments tables; report attendance counts including workshops with no enrollments.",
    doneWhen: "A LEFT JOIN includes empty workshops; duplicate enrollments are rejected; a test shows user input is bound as parameters.",
    resource: { title: "SQL roadmap", url: "https://roadmap.sh/sql" }
  },
  "node.js": {
    topics: "HTTP routes, validation and asynchronous error handling",
    task: "Build a small JSON API that creates and reads tasks with validated inputs and consistent error responses.",
    doneWhen: "Tests cover valid creation, malformed input and missing records; errors disclose no internal details.",
    resource: { title: "Node.js roadmap", url: "https://roadmap.sh/nodejs" }
  },
  python: {
    topics: "Collections, functions, file handling and tests",
    task: "Write a CSV-cleaning script that removes duplicate records and reports missing values.",
    doneWhen: "Tests cover empty files, duplicates and malformed rows; the script reports rejected rows without silently discarding them.",
    resource: { title: "Python roadmap", url: "https://roadmap.sh/python" }
  },
  docker: {
    topics: "Images, containers, ports and environment configuration",
    task: "Containerize a small API with a health check and document how to run it from a clean checkout.",
    doneWhen: "The container starts reproducibly; health checks pass; secrets stay outside the image and the application runs as a non-root user.",
    resource: { title: "Docker roadmap", url: "https://roadmap.sh/docker" }
  },
  excel: {
    topics: "Data cleaning, formulas and pivot summaries",
    task: "Clean a sample sales sheet and create a pivot summary by month and category.",
    doneWhen: "Summary totals reconcile with source rows; missing values and duplicates are documented; explain the formulas used.",
    resource: { title: "Data analyst roadmap", url: "https://roadmap.sh/data-analyst" }
  },
  figma: {
    topics: "Reusable components, layout and interaction states",
    task: "Design a job-search screen with reusable controls and mobile and desktop layouts.",
    doneWhen: "A prototype includes loading, empty and error states; document spacing, focus order and developer handoff details.",
    resource: null
  }
};

export function buildLearningRoadmap(profileSkills: string[], requiredSkills: string[]) {
  const match = matchSkills(profileSkills, requiredSkills);
  const steps: LearningExercise[] = match.missing.map(skill => ({
    skill,
    ...((Object.hasOwn(exercises, normalizeSkill(skill)) ? exercises[normalizeSkill(skill)] : undefined) ?? {
      topics: `${skill} fundamentals and a practical use case`,
      task: `Build a small demonstrable project using ${skill}; document the problem, implementation and limitations.`,
      doneWhen: "Provide a working example, test a failure case and explain your design decisions. Ask a qualified reviewer to assess the evidence.",
      resource: null
    })
  }));
  return { ...match, steps };
}
