"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sessionReplySchema, submissionResultSchema, type CheckResult, type CheckSession, type SkillBank } from "@/lib/skill-checks";
import { useUnsavedProfileGuard } from "./unsaved-profile-guard";

function AssessmentClock({ session, onExpired }: { session: CheckSession; onExpired: () => void }) {
  const initialSeconds = Math.max(0, Math.ceil((Date.parse(session.deadlineAt) - Date.parse(session.serverNow)) / 1000));
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const receivedAt = performance.now();
    const update = () => {
      const remaining = Math.max(0, Math.ceil(initialSeconds - (performance.now() - receivedAt) / 1000));
      setSeconds(remaining);
      if (remaining === 0) onExpired();
    };
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [initialSeconds, onExpired]);
  return <div className="check-clock">
    <p><span role="timer" aria-live="off" aria-label="Time remaining">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span> remaining · {session.timingMode === "extended" ? "Extended time" : "Standard time"}</p>
    <p role="status">{seconds === 0 ? "Time expired. The server will not grade late answers." : seconds <= 60 ? "Less than one minute remaining." : ""}</p>
  </div>;
}

function errorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data && data.error && typeof data.error === "object" && "message" in data.error && typeof data.error.message === "string") return data.error.message;
  return fallback;
}

export function SkillChecks({ banks, selected, results, initialSession = null }: {
  banks: SkillBank[]; selected: string[]; results: CheckResult[]; initialSession?: CheckSession | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [active, setActive] = useState<SkillBank | null>(() => banks.find(bank => bank.skill === initialSession?.skill && bank.version === initialSession.version) ?? null);
  const [timingMode, setTimingMode] = useState<"standard" | "extended">("standard");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [expired, setExpired] = useState(initialSession?.state === "expired");
  const [message, setMessage] = useState(initialSession ? "Your existing attempt has resumed. Its deadline has not restarted. Answers from a previous page load are not stored." : "");
  const [error, setError] = useState("");
  const formHeading = useRef<HTMLHeadingElement>(null);
  const checkList = useRef<HTMLDivElement>(null);
  const returnSkill = useRef<string | null>(null);
  const requestInFlight = useRef(false);
  const markExpired = useCallback(() => setExpired(true), []);
  useUnsavedProfileGuard(dirty, "Leave without submitting your skill-check answers? The deadline continues while you are away.");

  useEffect(() => {
    if (active) {
      returnSkill.current = active.skill;
      formHeading.current?.focus();
    } else if (returnSkill.current) {
      const index = banks.findIndex(bank => bank.skill === returnSkill.current);
      checkList.current?.querySelectorAll("section")[index]?.querySelector("button")?.focus();
      returnSkill.current = null;
    }
  }, [active, banks]);

  async function start(bank: SkillBank) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/skill-checks/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", skill: bank.skill, version: bank.version, timingMode }), signal: AbortSignal.timeout(15000)
      });
      const data: unknown = await response.json();
      if (!response.ok) { setError(errorMessage(data, "This attempt could not be started. Reload to check your current attempt.")); return; }
      const result = sessionReplySchema.safeParse(data);
      if (!result.success || !result.data.session || result.data.session.skill !== bank.skill) { setError("The attempt could not be verified. Reload before continuing."); return; }
      if (session && result.data.session.id !== session.id) setMessage("The previous attempt expired. A new attempt has started with a new deadline.");
      setSession(result.data.session); setExpired(result.data.session.state === "expired"); setActive(bank);
    } catch { setError("Could not confirm the start. Reload to resume any attempt created by the server; the deadline will not restart."); }
    finally { requestInFlight.current = false; setPending(false); }
  }

  async function endAttempt() {
    if (!session || requestInFlight.current || !window.confirm("End this attempt? Its answers will be discarded and no new grade will be recorded.")) return;
    requestInFlight.current = true;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/v1/skill-checks/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", sessionId: session.id }), signal: AbortSignal.timeout(15000)
      });
      const data: unknown = await response.json();
      if (!response.ok) { setError(errorMessage(data, "The attempt could not be ended. Reload to check its state.")); return; }
      if (!data || typeof data !== "object" || !("cancelled" in data) || data.cancelled !== true) { setError("The attempt state could not be verified. Reload before continuing."); return; }
      setDirty(false); setSession(null); setActive(null); setMessage("Attempt ended. Previous recorded results are unchanged. Wait one minute between new attempts.");
      router.refresh();
    } catch { setError("Could not confirm the attempt ended. Reload before starting another."); }
    finally { requestInFlight.current = false; setPending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || !session || expired || requestInFlight.current) return;
    const fields = new FormData(event.currentTarget);
    const answers = Object.fromEntries(active.questions.map(question => [question.id, Number(fields.get(question.id))]));
    requestInFlight.current = true;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/skill-checks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, answers }), signal: AbortSignal.timeout(15000)
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 410) setExpired(true);
        setError(errorMessage(data, "The result could not be confirmed. Your answers are still here.")); return;
      }
      const result = submissionResultSchema.safeParse(data && typeof data === "object" && "result" in data ? data.result : null);
      if (!result.success || result.data.skill !== active.skill || result.data.version !== active.version) { setError("The saved result could not be verified. Reload to check your recorded result before retrying."); return; }
      setMessage(`${result.data.skill}: ${result.data.score}/5. ${result.data.passed ? "Basics check passed. This skill is now eligible for your CV." : "Not passed yet. Review the fundamentals before another attempt."}`);
      setDirty(false); setSession(null); setActive(null); router.refresh();
    } catch { setError("Could not confirm the result. Your answers are still here. Retry this attempt while time remains, or reload to check the recorded result. Retrying cannot create a duplicate grade."); }
    finally { requestInFlight.current = false; setPending(false); }
  }

  function backToChecks() {
    if (dirty && !window.confirm("Discard these answers and return to the checks? The attempt deadline will continue.")) return;
    setDirty(false); setActive(null); setError("");
    setMessage("The attempt is still running. Resume it to continue; its deadline has not restarted.");
  }

  return <div className="account-content">
    <div className="page-heading"><div><p className="eyebrow">EVIDENCE BEFORE CLAIMS</p><h1>Put your skills to work.</h1><p>Pass a basics check before a selected skill can appear on your CV.</p></div><Link className="button" href="/cv">View my CV</Link></div>
    <p className="muted-note">These five-question React/SQL checks assess limited fundamentals, not identity, professional proficiency or mastery. Pass mark: 4/5. Other skills remain self-reported and excluded from your CV until supported checks exist.</p>
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {(error || expired) && <button type="button" className="text-button" onClick={() => window.location.reload()}>Reload recorded results (clears local answers)</button>}
    {session && <AssessmentClock key={`${session.id}:${session.serverNow}`} session={session} onExpired={markExpired} />}
    {!active ? <>
      <div className="check-timing"><label htmlFor="check-timing-mode">Time allowance for a new attempt</label><select id="check-timing-mode" value={timingMode} disabled={pending || (!!session && !expired)} onChange={event => setTimingMode(event.target.value as "standard" | "extended")}><option value="standard">Standard · 10 minutes</option><option value="extended">Extended · 100 minutes</option></select><p className="muted-note">Choose extended time if you need more time to read or use assistive tools. Timing does not prove identity or detect dishonesty. Existing attempts keep their original allowance.</p></div>
      <div ref={checkList} className="check-grid">{banks.map(bank => {
        const included = selected.some(skill => skill.toLowerCase().trim() === bank.skill.toLowerCase());
        const passed = results.some(result => result.skill === bank.skill && result.version === bank.version && result.passed);
        const resumable = session?.skill === bank.skill;
        return <section className="panel check-card" key={bank.skill}>
          <p className="eyebrow">{passed ? "BASICS CHECK PASSED" : "NOT YET ASSESSED"}</p><h2>{bank.skill}</h2><p>Five questions · 4/5 to pass</p>
          <button className="button primary" disabled={pending || (!resumable && (!included || (!!session && !expired)))} onClick={() => start(bank)}>{resumable ? expired ? "Start new attempt" : "Resume check" : passed ? "Retake check" : "Start check"}</button>
          {!included && <p><Link className="text-button" href="/account">Add this skill to your profile first</Link></p>}
        </section>;
      })}</div>
    </> : <form className="panel check-form" onSubmit={submit} onChange={() => setDirty(true)} aria-busy={pending}>
      <h2 ref={formHeading} tabIndex={-1}>{active.skill} basics</h2>
      <p className="muted-note">The server enforces the deadline, including time away. Answers stay only on this page and are lost on reload. Nothing is submitted automatically.</p>
      <fieldset disabled={pending || expired}>{active.questions.map((question, index) => <fieldset className="check-question" key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} value={optionIndex} required />{option}</label>)}</fieldset>)}</fieldset>
      <div className="check-actions"><button className="button primary" disabled={pending || expired}>{pending ? "Saving…" : "Submit answers"}</button><button className="text-button" type="button" disabled={pending} onClick={backToChecks}>Back to checks</button><button className="text-button" type="button" disabled={pending} onClick={endAttempt}>End attempt</button></div>
    </form>}
  </div>;
}
