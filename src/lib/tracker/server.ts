import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { catalogJob, trackerEntry } from "./schemas";
import { TrackerError, type TrackerAccess } from "./handlers";

const selection = "job_id,status,revision,created_at,updated_at,job:job_postings(*)";
const conflict = () => new TrackerError("CONFLICT", "This opportunity changed elsewhere. Refresh and choose again.", 409);
const missing = () => new TrackerError("NOT_FOUND", "This opportunity is not available.", 404);

export function trackerAccess(client: SupabaseClient, userId: string): TrackerAccess {
  const own = () => client.from("saved_jobs").select(selection).eq("user_id", userId);
  async function read(id: string) {
    const { data, error } = await own().eq("job_id", id).maybeSingle();
    if (error) throw error;
    return data ? trackerEntry(data) : null;
  }
  return {
    async jobs() {
      const { data, error } = await client.from("job_postings").select("*").eq("is_active", true).order("id");
      if (error) throw error;
      return (data ?? []).map(catalogJob);
    },
    async list() {
      const { data, error } = await own().order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(trackerEntry);
    },
    async save(id) {
      const existing = await read(id);
      if (existing) return { application: existing, created: false };
      const { data: job, error: jobError } = await client.from("job_postings").select("id,is_active").eq("id", id).maybeSingle();
      if (jobError) throw jobError;
      if (!job) throw missing();
      if (!job.is_active) throw conflict();
      const { data, error } = await client.from("saved_jobs").upsert({ user_id: userId, job_id: id }, { onConflict: "user_id,job_id", ignoreDuplicates: true }).select("job_id");
      if (error) { if (error.code === "23514" || error.code === "23503") throw conflict(); throw error; }
      const application = await read(id);
      if (!application) throw conflict();
      return { application, created: !!data?.length };
    },
    async update(id, revision, status) {
      const { data, error } = await client.from("saved_jobs").update({ status }).eq("user_id", userId).eq("job_id", id).eq("revision", revision).select(selection).maybeSingle();
      if (error) throw error;
      if (data) return trackerEntry(data);
      if (!await read(id)) throw missing();
      throw conflict();
    },
    async remove(id, revision) {
      const { data, error } = await client.from("saved_jobs").delete().eq("user_id", userId).eq("job_id", id).eq("revision", revision).select("job_id");
      if (error) throw error;
      if (!data?.length && await read(id)) throw conflict();
    }
  };
}

export async function authorizeTracker() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    if (error.status === 400 || error.status === 401 || error.name === "AuthSessionMissingError") return null;
    throw error;
  }
  return user ? trackerAccess(client, user.id) : null;
}
