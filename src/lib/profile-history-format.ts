import type { EducationRecord, ExperienceRecord } from "./profile-history";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function knownDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${months[month - 1]} ${year}`;
}

/** Date-only records use a fixed month vocabulary and UTC, independent of device locale. */
export function formatHistoryDate(value: string | null): string {
  return knownDate(value) ?? "Date not provided";
}

export function formatHistoryPeriod(record: Pick<ExperienceRecord, "startDate" | "endDate" | "isCurrent">): string {
  const start = knownDate(record.startDate);
  const end = knownDate(record.endDate);
  if (!start && !end && !record.isCurrent) return "Dates not provided";
  return `${start ?? "Start date not provided"} – ${record.isCurrent ? "Present" : end ?? "End date not provided"}`;
}

/** Keep the entered number and scale; do not convert or imply a universal GPA scale. */
export function formatHistoryGpa(record: Pick<EducationRecord, "gpa" | "gpaScale">): string | null {
  const { gpa, gpaScale } = record;
  if (gpa === null || gpaScale === null || !Number.isFinite(gpa) || !Number.isFinite(gpaScale) ||
    gpa < 0 || gpaScale <= 0 || gpaScale > 100 || gpa > gpaScale) return null;
  return `GPA: ${gpa} / ${gpaScale}`;
}
