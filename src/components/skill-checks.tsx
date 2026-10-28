"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submissionResultSchema, type CheckResult, type SkillBank } from "@/lib/skill-checks";
import { useUnsavedProfileGuard } from "./unsaved-profile-guard";

export function SkillChecks({ banks, selected, results }: { banks: SkillBank[]; selected: string[]; results: CheckResult[] }) {
  const router = useRouter();
  const [active, setActive] = useState<SkillBank | null>(null);
  const [dirty, setDirty] = useState(false);
  useUnsavedProfileGuard(dirty, "Leave without submitting your skill-check answers?");
  const formHeading = useRef<HTMLHeadingElement>(null);
  const checkList = useRef<HTMLDivElement>(null);
  const returnSkill = useRef<string | null>(null);
  useEffect(() => {
    if (active) {
      returnSkill.current = active.skill;
      formHeading.current?.focus();
    } else if (returnSkill.current) {
      const cards = checkList.current?.querySelectorAll("section");
      const index = banks.findIndex(bank => bank.skill === returnSkill.current);
      cards?.[index]?.querySelector("button")?.focus();
      returnSkill.current = null;
    }
  }, [active, banks]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || pending) return;
    const fields = new FormData(event.currentTarget);
    const answers = Object.fromEntries(active.questions.map(q => [q.id, Number(fields.get(q.id))]));
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/skill-checks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skill: active.skill, version: active.version, answers }), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "Check could not be saved."); return; }
      const result = submissionResultSchema.safeParse(data.result);
      if (!result.success || result.data.skill !== active.skill || result.data.version !== active.version) {
        setError("The saved result could not be verified. Your answers are still here. Reload to check your recorded result before retrying.");
        return;
      }
      setMessage(`${result.data.skill}: ${result.data.score}/5. ${result.data.passed ? "Basics check passed. This skill is now eligible for your CV." : "Not passed yet. Review the fundamentals and try again after one minute."}`);
      setDirty(false);
      setActive(null); router.refresh();
    } catch { setError("Could not confirm the result. Your answers are still here. Reload to check your recorded result before retrying."); }
    finally { setPending(false); }
  }
  return <div className="account-content"><div className="page-heading"><div><p className="eyebrow">EVIDENCE BEFORE CLAIMS</p><h1>Put your skills to work.</h1><p>Pass a basics check before a selected skill can appear on your CV.</p></div><Link className="button" href="/cv">View my CV</Link></div>
    <p className="muted-note">These five-question checks assess a limited set of fundamentals. Passing is not proof of identity, professional proficiency or mastery. The current pilot covers React and SQL; other skills remain self-reported and are excluded from your CV until supported checks exist. Pass mark: 4/5. No time limit.</p>
    {message && <p className="notice" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    {!active ? <div ref={checkList} className="check-grid">{banks.map(bank => {
      const included = selected.some(skill => skill.toLowerCase().trim() === bank.skill.toLowerCase());
      const passed = results.some(result => result.skill === bank.skill && result.version === bank.version && result.passed);
      return <section className="panel check-card" key={bank.skill}><p className="eyebrow">{passed ? "BASICS CHECK PASSED" : "NOT YET ASSESSED"}</p><h2>{bank.skill}</h2><p>Five questions · 4/5 to pass</p><button className="button primary" disabled={!included} onClick={() => { setActive(bank); setMessage(""); setError(""); }}>{passed ? "Retake check" : "Start check"}</button>{!included && <p><Link className="text-button" href="/account">Add this skill to your profile first</Link></p>}</section>;
    })}</div> : <form className="panel check-form" onSubmit={submit} onChange={() => setDirty(true)} aria-busy={pending}><h2 ref={formHeading} tabIndex={-1}>{active.skill} basics</h2><fieldset disabled={pending}>{active.questions.map((q, index) => <fieldset className="check-question" key={q.id}><legend>{index + 1}. {q.prompt}</legend>{q.options.map((option, i) => <label key={option}><input type="radio" name={q.id} value={i} required />{option}</label>)}</fieldset>)}</fieldset><div className="check-actions"><button className="button primary" disabled={pending}>{pending ? "Saving result…" : "Submit answers"}</button><button className="text-button" type="button" disabled={pending} onClick={() => { if (!dirty || window.confirm("Discard your skill-check answers?")) { setDirty(false); setActive(null); setError(""); } }}>Cancel</button></div></form>}
  </div>;
}
