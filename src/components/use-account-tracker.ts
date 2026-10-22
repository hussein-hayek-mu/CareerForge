"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrackerData, TrackerEntry } from "@/lib/tracker/schemas";

export function useAccountTracker(initial: TrackerData | undefined) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const locks = useRef(new Set<string>());
  const generation = useRef(0);
  const enabled = !!initial;
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const request = ++generation.current;
    try {
      const responses = await Promise.all([fetch("/api/v1/jobs", { cache: "no-store", signal: AbortSignal.timeout(15000) }), fetch("/api/v1/applications", { cache: "no-store", signal: AbortSignal.timeout(15000) })]);
      if (responses.some(r => !r.ok)) throw new Error(responses.some(r => r.status === 401) ? "Your session expired. Sign in again to continue." : "Your opportunities could not be refreshed. Please retry.");
      const [catalog, tracker] = await Promise.all(responses.map(r => r.json()));
      if (!Array.isArray(catalog.jobs) || !Array.isArray(tracker.applications)) throw new Error("Your opportunities could not be refreshed. Please retry.");
      if (generation.current === request) { setData({ jobs: catalog.jobs, applications: tracker.applications }); setError(""); }
      return true;
    } catch (err) {
      if (generation.current === request) setError(err instanceof Error && err.name === "Error" ? err.message : "Connection interrupted. Refresh your opportunities before trying again.");
      return false;
    }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const focus = () => { if (!document.hidden) void refresh(); };
    const invalidate = () => { generation.current++; };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => { window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); invalidate(); };
  }, [enabled, refresh]);

  async function mutate(id: string, status?: TrackerEntry["status"]) {
    if (!data || error || locks.current.has(id)) return;
    locks.current.add(id); setPending([...locks.current]); setMessage("");
    const entry = data.applications.find(item => item.jobId === id);
    const method = status ? "PATCH" : entry ? "DELETE" : "POST";
    try {
      const response = await fetch(`/api/v1/applications${method === "POST" ? "" : `/${encodeURIComponent(id)}`}`, {
        method, headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify(method === "POST" ? { jobId: id } : { revision: entry?.revision, ...(status ? { status } : {}) })
      });
      if (!response.ok) {
        if (response.status === 409) setMessage("This opportunity changed elsewhere. The latest status has been loaded; choose again.");
        else if (response.status === 401) setMessage("Your session expired. Sign in again to continue.");
        else setMessage("The change could not be confirmed. Review the refreshed tracker and try again.");
      } else {
        setMessage(status ? "Application status saved to your account." : entry ? "Opportunity removed from your account tracker." : "Opportunity saved to your account tracker.");
      }
    } catch { setMessage("Connection interrupted. Review the refreshed tracker before trying again; the change may have reached the server."); }
    finally { await refresh(); locks.current.delete(id); setPending([...locks.current]); }
  }
  return { data, error, message, pending, mutate, refresh };
}
