import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import {
  educationFieldsSchema, experienceFieldsSchema, educationRecordSchema, experienceRecordSchema,
  profileHistorySchema, historyLimits, type HistoryFields, type HistoryKind, type HistoryRecord, type ProfileHistory
} from "./profile-history";
import { ProfileHistoryError, type HistoryAccess } from "./profile-history-handlers";

const tables = { education: "education_records", experience: "experience_records" } as const;
const metadata = "id,revision,created_at,updated_at,creation_payload";
const selection = {
  education: metadata + ",institution,degree,start_date,end_date,is_current,gpa,gpa_scale",
  experience: metadata + ",company,role,description,start_date,end_date,is_current"
} as const;
const objectSchema = z.record(z.string(), z.unknown());
const missing = () => new ProfileHistoryError("NOT_FOUND", "This history record is not available.", 404);
const conflict = () => new ProfileHistoryError("CONFLICT", "This record changed elsewhere. Reload the saved history before editing it again.", 409);

function recordFromRow(kind: HistoryKind, input: unknown): HistoryRecord {
  const row = objectSchema.parse(input);
  const common = {
    id: row.id, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at,
    evidenceStatus: "self_reported" as const, startDate: row.start_date, endDate: row.end_date, isCurrent: row.is_current
  };
  return kind === "education"
    ? educationRecordSchema.parse({ ...common, institution: row.institution, degree: row.degree, gpa: row.gpa, gpaScale: row.gpa_scale })
    : experienceRecordSchema.parse({ ...common, company: row.company, role: row.role, description: row.description });
}
function fieldsToRow(kind: HistoryKind, fields: HistoryFields) {
  if (kind === "education") {
    const value = educationFieldsSchema.parse(fields);
    return { institution: value.institution, degree: value.degree, start_date: value.startDate, end_date: value.endDate, is_current: value.isCurrent, gpa: value.gpa, gpa_scale: value.gpaScale };
  }
  const value = experienceFieldsSchema.parse(fields);
  return { company: value.company, role: value.role, description: value.description, start_date: value.startDate, end_date: value.endDate, is_current: value.isCurrent };
}
function storageFailure(error: { code?: string; message?: string }): never {
  if (error.code === "P0001" && error.message === "HISTORY_LIMIT_REACHED") {
    throw new ProfileHistoryError("HISTORY_LIMIT_REACHED", "The maximum number of records has been reached. Remove an old record before adding another.", 409);
  }
  throw new Error("Profile history storage unavailable");
}

export function historyAccess(client: SupabaseClient, userId: string): HistoryAccess {
  const own = (kind: HistoryKind) => client.from(tables[kind]).select(selection[kind]).eq("user_id", userId);
  async function read(kind: HistoryKind, id: string) {
    const { data, error } = await own(kind).eq("id", id).maybeSingle();
    if (error) storageFailure(error);
    return data ? recordFromRow(kind, data) : null;
  }
  async function list(kind: HistoryKind) {
    const { data, error } = await own(kind).order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).order("id").limit(historyLimits[kind] + 1);
    if (error) storageFailure(error);
    return (data ?? []).map((row: unknown) => recordFromRow(kind, row));
  }
  async function readAll(): Promise<ProfileHistory> {
    const [education, experience] = await Promise.all([list("education"), list("experience")]);
    return profileHistorySchema.parse({ education, experience });
  }
  return {
    userId, list, readAll,
    async create(kind, requestId, fields) {
      const values = fieldsToRow(kind, fields);
      const { data, error } = await client.from(tables[kind]).upsert({ ...values, user_id: userId, request_id: requestId }, { onConflict: "user_id,request_id", ignoreDuplicates: true }).select(selection[kind]).maybeSingle();
      if (error) storageFailure(error);
      if (data) return { record: recordFromRow(kind, data), created: true };
      const existing = await own(kind).eq("request_id", requestId).maybeSingle();
      if (existing.error) storageFailure(existing.error);
      if (!existing.data) throw conflict();
      const row = objectSchema.parse(existing.data);
      const schema = kind === "education" ? educationFieldsSchema : experienceFieldsSchema;
      if (JSON.stringify(schema.parse(row.creation_payload)) !== JSON.stringify(schema.parse(fields))) {
        throw new ProfileHistoryError("REQUEST_CONFLICT", "This save identifier was already used for different details. Reload the saved records before starting a new record.", 409);
      }
      return { record: recordFromRow(kind, existing.data), created: false };
    },
    async update(kind, id, revision, fields) {
      const { data, error } = await client.from(tables[kind]).update(fieldsToRow(kind, fields)).eq("user_id", userId).eq("id", id).eq("revision", revision).select(selection[kind]).maybeSingle();
      if (error) storageFailure(error);
      if (data) return recordFromRow(kind, data);
      if (!await read(kind, id)) throw missing();
      throw conflict();
    },
    async remove(kind, id, revision) {
      const { data, error } = await client.from(tables[kind]).delete().eq("user_id", userId).eq("id", id).eq("revision", revision).select("id");
      if (error) storageFailure(error);
      if (data?.length) return;
      if (!await read(kind, id)) throw missing();
      throw conflict();
    }
  };
}

export async function authorizeHistory(): Promise<HistoryAccess | null> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    if (error.status === 400 || error.status === 401 || error.name === "AuthSessionMissingError") return null;
    throw new Error("Session verification unavailable");
  }
  return user ? historyAccess(client, user.id) : null;
}

/** The caller supplies an already verified owner; authenticated reads still enforce RLS. */
export async function readProfileHistory(userId: string): Promise<ProfileHistory> {
  return historyAccess(await createClient(), userId).readAll();
}
