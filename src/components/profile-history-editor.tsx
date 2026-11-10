"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { z } from "zod";
import { useUnsavedProfileGuard } from "./unsaved-profile-guard";
import {
  educationFieldsSchema, experienceFieldsSchema, educationRecordSchema, experienceRecordSchema,
  profileHistorySchema, type EducationRecord, type ExperienceRecord, type ProfileHistory
} from "@/lib/profile-history";
import { formatHistoryPeriod, formatHistoryGpa } from "@/lib/profile-history-format";

type Kind = "education" | "experience";
type Fields = {
  institution: string; degree: string; company: string; role: string; description: string;
  startDate: string; endDate: string; isCurrent: boolean; gpa: string; gpaScale: string;
};
type TextField = Exclude<keyof Fields, "isCurrent">;
type Draft = { kind: Kind; id: string | null; revision: string | null; requestId: string; values: Fields; baseline: Fields };
const endpoints = { education: "/api/v1/education", experience: "/api/v1/experience" };
const subscribeReady = () => () => {};
const errorSchema = z.object({ error: z.object({ message: z.string() }) });

class HistoryRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function readResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = errorSchema.safeParse(body);
    throw new HistoryRequestError(parsed.success ? parsed.data.error.message : "The request could not be confirmed.", response.status);
  }
  return body;
}
function newDraft(kind: Kind, record?: EducationRecord | ExperienceRecord): Draft {
  const values: Fields = {
    institution: record && "institution" in record ? record.institution : "",
    degree: record && "degree" in record ? record.degree : "",
    company: record && "company" in record ? record.company : "",
    role: record && "role" in record ? record.role : "",
    description: record && "description" in record ? record.description : "",
    startDate: record?.startDate ?? "", endDate: record?.endDate ?? "", isCurrent: record?.isCurrent ?? false,
    gpa: record && "gpa" in record && record.gpa !== null ? String(record.gpa) : "",
    gpaScale: record && "gpaScale" in record && record.gpaScale !== null ? String(record.gpaScale) : ""
  };
  return { kind, id: record?.id ?? null, revision: record?.revision ?? null, requestId: crypto.randomUUID(), values, baseline: { ...values } };
}
function newestFirst<T extends { startDate: string | null; createdAt: string; id: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "") || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export function ProfileHistoryEditor({ initial }: { initial: ProfileHistory }) {
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const [history, setHistory] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [needsReload, setNeedsReload] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const educationAdd = useRef<HTMLButtonElement>(null);
  const experienceAdd = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<Kind | null>(null);
  const dirty = !!draft && JSON.stringify(draft.values) !== JSON.stringify(draft.baseline);
  const editorSessionId = draft?.requestId;
  useUnsavedProfileGuard(dirty);

  useEffect(() => {
    if (editorSessionId) {
      form.current?.scrollIntoView({ block: "start" });
      form.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    } else if (restoreFocus.current) {
      (restoreFocus.current === "education" ? educationAdd : experienceAdd).current?.focus();
      restoreFocus.current = null;
    }
  }, [editorSessionId]); // A new editor session restores keyboard context once.

  function closeDraft() {
    if (dirty && !window.confirm("Discard your unsaved record changes?")) return;
    restoreFocus.current = draft?.kind ?? null;
    setDraft(null); setFieldErrors({}); setError("");
  }
  function openDraft(kind: Kind, record?: EducationRecord | ExperienceRecord) {
    if (dirty && !window.confirm("Discard your unsaved record changes?")) return;
    setDraft(newDraft(kind, record)); setFieldErrors({}); setError(""); setMessage("");
  }
  function change(field: TextField, value: string) {
    setDraft(current => current ? { ...current, values: { ...current.values, [field]: value } } : current);
  }
  async function reload() {
    setPending(true); setError(""); setMessage("");
    try {
      const [education, experience] = await Promise.all([
        fetch(endpoints.education, { cache: "no-store", signal: AbortSignal.timeout(15000) }).then(readResponse),
        fetch(endpoints.experience, { cache: "no-store", signal: AbortSignal.timeout(15000) }).then(readResponse)
      ]);
      const next = profileHistorySchema.parse({
        education: z.object({ records: z.array(educationRecordSchema) }).parse(education).records,
        experience: z.object({ records: z.array(experienceRecordSchema) }).parse(experience).records
      });
      setHistory(next); setNeedsReload(false);
      setMessage(draft ? "Saved records reloaded. Your open draft has been kept; cancel it to edit the latest version." : "Saved records reloaded.");
    } catch {
      setError("Saved records could not be reloaded. Your current records and open draft are still here.");
    } finally { setPending(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || pending) return;
    const common = { startDate: draft.values.startDate || null, endDate: draft.values.endDate || null, isCurrent: draft.values.isCurrent };
    const parsed = draft.kind === "education"
      ? educationFieldsSchema.safeParse({ ...common, institution: draft.values.institution, degree: draft.values.degree,
        gpa: draft.values.gpa.trim() ? Number(draft.values.gpa) : null, gpaScale: draft.values.gpaScale.trim() ? Number(draft.values.gpaScale) : null })
      : experienceFieldsSchema.safeParse({ ...common, company: draft.values.company, role: draft.values.role, description: draft.values.description });
    setError(""); setMessage(""); setFieldErrors({});
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "record")] ??= issue.message;
      setFieldErrors(fields); setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setPending(true);
    try {
      const body = draft.id ? { ...parsed.data, revision: draft.revision } : { ...parsed.data, requestId: draft.requestId };
      const result = await fetch(endpoints[draft.kind] + (draft.id ? "/" + draft.id : ""), {
        method: draft.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
      }).then(readResponse);
      const saved = draft.kind === "education"
        ? z.object({ record: educationRecordSchema }).parse(result).record
        : z.object({ record: experienceRecordSchema }).parse(result).record;
      setHistory(current => draft.kind === "education"
        ? { ...current, education: [...current.education.filter(item => item.id !== saved.id), educationRecordSchema.parse(saved)] }
        : { ...current, experience: [...current.experience.filter(item => item.id !== saved.id), experienceRecordSchema.parse(saved)] });
      restoreFocus.current = draft.kind;
      setDraft(null); setNeedsReload(false); setMessage(draft.kind === "education" ? "Education record saved." : "Experience record saved.");
    } catch (failure) {
      if (failure instanceof HistoryRequestError) {
        setError(failure.message);
        if (failure.status === 409 || failure.status >= 500) setNeedsReload(true);
      } else {
        setError("The save could not be confirmed and may have reached the server. Your draft is still here. Check saved records before starting another record.");
        setNeedsReload(true);
      }
    } finally { setPending(false); }
  }
  async function remove(kind: Kind, record: EducationRecord | ExperienceRecord) {
    if (!window.confirm("Delete this " + kind + " record from your saved profile and future CV previews?")) return;
    setPending(true); setError(""); setMessage("");
    try {
      await fetch(endpoints[kind] + "/" + record.id, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: record.revision }), signal: AbortSignal.timeout(15000)
      }).then(readResponse);
      setHistory(current => kind === "education"
        ? { ...current, education: current.education.filter(item => item.id !== record.id) }
        : { ...current, experience: current.experience.filter(item => item.id !== record.id) });
      if (draft?.id === record.id) { restoreFocus.current = kind; setDraft(null); }
      setNeedsReload(false); setMessage(kind === "education" ? "Education record deleted." : "Experience record deleted.");
    } catch (failure) {
      setError(failure instanceof HistoryRequestError ? failure.message : "The deletion could not be confirmed. Reload saved records to check its outcome.");
      setNeedsReload(true);
    } finally { setPending(false); }
  }
  function field(name: TextField, label: string, options: { type?: string; required?: boolean; maxLength?: number; multiline?: boolean } = {}) {
    if (!draft) return null;
    const id = "history-" + name;
    const invalid = !!fieldErrors[name];
    const shared = { id, name, value: draft.values[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(name, event.target.value),
      required: options.required, maxLength: options.maxLength, "aria-invalid": invalid, "aria-describedby": invalid ? id + "-error" : undefined };
    return <div className={"history-field" + (options.multiline ? " history-field-wide" : "")}>
      <label htmlFor={id}>{label}</label>
      {options.multiline ? <textarea {...shared} rows={4} /> : <input {...shared} type={options.type ?? "text"}
        disabled={pending || !ready || (name === "endDate" && draft.values.isCurrent)}
        min={options.type === "date" ? "1900-01-01" : options.type === "number" ? 0 : undefined}
        max={options.type === "date" ? "2100-12-31" : options.type === "number" ? 100 : undefined}
        step={options.type === "number" ? "any" : undefined} />}
      {invalid && <p className="form-error" id={id + "-error"}>{fieldErrors[name]}</p>}
    </div>;
  }

  return <div className="profile-history-page">
    <Link href="/account" className="text-button">← Back to profile</Link>
    <div className="page-heading"><div><p className="eyebrow">YOUR PRIVATE PROFILE</p><h1>Education &amp; experience.</h1><p>Save the details behind your story, then include them in your saved-profile CV.</p></div>
      <div className="history-page-actions"><button type="button" className="button dark" onClick={reload} disabled={!ready || pending}>Reload saved records</button><Link className="button primary" href="/cv/saved">Preview saved CV</Link></div>
    </div>
    <p className="history-evidence-note">These records are self-reported. Issuer and employer verification are not connected. Your existing profile summaries remain separate.</p>
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="form-error history-error" role="alert">{error}</p>}
    {needsReload && <p className="muted-note">Reload saved records to review the latest state. Your open draft will be kept.</p>}
    {draft && <form ref={form} className="panel history-form" onSubmit={save} aria-label={draft.kind === "education" ? "Education record editor" : "Experience record editor"}>
      <div className="section-heading"><h2>{draft.id ? "Edit " : "Add "}{draft.kind}</h2><span className="outline-label">Self-reported</span></div>
      <fieldset disabled={!ready || pending}><legend className="history-form-hint">Dates are optional. Leave unknown dates blank; mark current study or work explicitly.</legend>
        <div className="history-fields">
          {draft.kind === "education" ? <>{field("institution", "Institution", { required: true, maxLength: 160 })}{field("degree", "Degree", { required: true, maxLength: 160 })}</>
            : <>{field("company", "Company", { required: true, maxLength: 160 })}{field("role", "Role", { required: true, maxLength: 160 })}</>}
          {field("startDate", "Start date", { type: "date" })}{field("endDate", "End date", { type: "date" })}
          <label className="history-current history-field-wide"><input type="checkbox" checked={draft.values.isCurrent} onChange={event => setDraft(current => current ? { ...current, values: { ...current.values, isCurrent: event.target.checked, endDate: event.target.checked ? "" : current.values.endDate } } : current)} />{draft.kind === "education" ? "I currently study here" : "I currently work here"}</label>
          {draft.kind === "education" ? <>{field("gpa", "GPA (optional)", { type: "number" })}{field("gpaScale", "GPA scale (optional)", { type: "number" })}<p className="history-form-hint history-field-wide">Enter both GPA and its scale, such as 3.6 and 4, or leave both blank.</p></>
            : field("description", "Experience description", { maxLength: 2000, multiline: true })}
        </div>
      </fieldset>
      <div className="form-footer"><span className="profile-save-state">{dirty ? "Unsaved changes" : "No unsaved changes"}</span><div className="history-page-actions">
        <button type="button" className="text-button" onClick={closeDraft} disabled={pending}>Cancel editing</button>
        <button type="submit" className="button primary" disabled={!ready || pending || !dirty}>{pending ? "Saving…" : draft.kind === "education" ? "Save education" : "Save experience"}</button>
      </div></div>
    </form>}
    <div className="history-columns">
      <section className="history-section" aria-label="Saved education">
        <div className="section-heading"><div><h2>Education</h2><p>{history.education.length} of 20 records</p></div><button ref={educationAdd} type="button" className="button dark" onClick={() => openDraft("education")} disabled={!ready || pending || history.education.length >= 20}>Add education</button></div>
        {history.education.length ? newestFirst(history.education).map(record => <article className="panel history-card" key={record.id}>
          <p className="eyebrow">SELF-REPORTED</p><h3>{record.institution}</h3><p className="history-record-title">{record.degree}</p>
          {formatHistoryPeriod(record) && <p className="muted-note">{formatHistoryPeriod(record)}</p>}
          {record.gpa !== null && <p>{formatHistoryGpa(record)}</p>}
          <div className="history-card-actions"><button type="button" className="text-button" onClick={() => openDraft("education", record)} disabled={!ready || pending} aria-label={"Edit education at " + record.institution}>Edit</button>
            <button type="button" className="text-button history-delete" onClick={() => remove("education", record)} disabled={!ready || pending} aria-label={"Delete education at " + record.institution}>Delete</button></div>
        </article>) : <div className="history-empty"><p>No education records yet.</p><p>Add your institution, degree and any dates or GPA you want to include.</p></div>}
      </section>
      <section className="history-section" aria-label="Saved experience">
        <div className="section-heading"><div><h2>Experience</h2><p>{history.experience.length} of 50 records</p></div><button ref={experienceAdd} type="button" className="button dark" onClick={() => openDraft("experience")} disabled={!ready || pending || history.experience.length >= 50}>Add experience</button></div>
        {history.experience.length ? newestFirst(history.experience).map(record => <article className="panel history-card" key={record.id}>
          <p className="eyebrow">SELF-REPORTED</p><h3>{record.role}</h3><p className="history-record-title">{record.company}</p>
          {formatHistoryPeriod(record) && <p className="muted-note">{formatHistoryPeriod(record)}</p>}
          {record.description && <p className="history-description">{record.description}</p>}
          <div className="history-card-actions"><button type="button" className="text-button" onClick={() => openDraft("experience", record)} disabled={!ready || pending} aria-label={"Edit experience at " + record.company}>Edit</button>
            <button type="button" className="text-button history-delete" onClick={() => remove("experience", record)} disabled={!ready || pending} aria-label={"Delete experience at " + record.company}>Delete</button></div>
        </article>) : <div className="history-empty"><p>No experience records yet.</p><p>Add work, internships or other roles and describe your own contribution.</p></div>}
      </section>
    </div>
  </div>;
}
