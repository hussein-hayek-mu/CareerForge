import { z } from "zod";

export const historyLimits = { education: 20, experience: 50 } as const;
export type HistoryKind = keyof typeof historyLimits;

const historyDateSchema = z.iso.date().refine(value => value >= "1900-01-01" && value <= "2100-12-31", "Use a date between 1900 and 2100.");
const dateFields = {
  startDate: historyDateSchema.nullable().default(null),
  endDate: historyDateSchema.nullable().default(null),
  isCurrent: z.boolean().default(false)
};
const educationFields = z.object({
  institution: z.string().trim().min(1).max(160),
  degree: z.string().trim().min(1).max(160),
  ...dateFields,
  gpa: z.number().finite().min(0).max(100).nullable().default(null),
  gpaScale: z.number().finite().gt(0).max(100).nullable().default(null)
}).strict();
const experienceFields = z.object({
  company: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(""),
  ...dateFields
}).strict();
function checkDates(value: { startDate: string | null; endDate: string | null; isCurrent: boolean }, context: z.RefinementCtx) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after the start date." });
  }
  if (value.isCurrent && value.endDate !== null) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "A current record cannot have an end date." });
  }
}
function checkEducation(value: z.infer<typeof educationFields>, context: z.RefinementCtx) {
  checkDates(value, context);
  if ((value.gpa === null) !== (value.gpaScale === null)) {
    context.addIssue({ code: "custom", path: ["gpa"], message: "Provide both GPA and its scale, or leave both empty." });
  }
  if (value.gpa !== null && value.gpaScale !== null && value.gpa > value.gpaScale) {
    context.addIssue({ code: "custom", path: ["gpa"], message: "GPA cannot exceed its scale." });
  }
}
export const educationFieldsSchema = educationFields.superRefine(checkEducation);
export const experienceFieldsSchema = experienceFields.superRefine(checkDates);
const recordMetadata = {
  id: z.uuid(),
  revision: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  evidenceStatus: z.literal("self_reported")
};
export const educationRecordSchema = educationFields.extend(recordMetadata).superRefine(checkEducation);
export const experienceRecordSchema = experienceFields.extend(recordMetadata).superRefine(checkDates);
export const profileHistorySchema = z.object({
  education: z.array(educationRecordSchema).max(historyLimits.education),
  experience: z.array(experienceRecordSchema).max(historyLimits.experience)
}).strict();

export type EducationFields = z.infer<typeof educationFieldsSchema>;
export type ExperienceFields = z.infer<typeof experienceFieldsSchema>;
export type EducationRecord = z.infer<typeof educationRecordSchema>;
export type ExperienceRecord = z.infer<typeof experienceRecordSchema>;
export type ProfileHistory = z.infer<typeof profileHistorySchema>;
export type HistoryFields = EducationFields | ExperienceFields;
export type HistoryRecord = EducationRecord | ExperienceRecord;
