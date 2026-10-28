import Link from "next/link";
import type { AccountProfile } from "@/lib/account/schemas";
import type { CatalogJob } from "@/lib/tracker/schemas";
import { buildLearningRoadmap } from "@/lib/learning-roadmap";

export function LearningRoadmap({ profile, jobs, targetId }: {
  profile: AccountProfile; jobs: CatalogJob[]; targetId?: string;
}) {
  const target = jobs.find(job => job.id === targetId);
  const plan = target ? buildLearningRoadmap(profile.skills, target.skills) : null;
  return <div className="feature-page learning-page">
    <header className="feature-heading">
      <div className="feature-kicker"><p className="eyebrow">FROM GAP TO PRACTICE</p><span className="feature-status status-pilot">Pilot</span></div>
      <h1>Make your next skill concrete.</h1>
      <p>Choose a role. Turn its missing skills into focused exercises with a clear outcome.</p>
    </header>
    <section className="panel learning-target" aria-labelledby="learning-target-heading">
      <h2 id="learning-target-heading">Choose your practice target</h2>
      <p>Targets come from the current fictional job catalog. This is a practice plan, not evidence of a live vacancy or a hiring prediction.</p>
      {jobs.length ? <form action="/learning-roadmap" method="get" className="learning-target-form">
        <div><label htmlFor="learning-target">Target role</label><select id="learning-target" name="target" defaultValue={target?.id ?? ""} required key={target?.id ?? "empty"}>
          <option value="" disabled>Select a role</option>
          {jobs.map(job => <option value={job.id} key={job.id}>{job.title} · {job.company}</option>)}
        </select></div>
        <button className="button primary" type="submit">Show my plan</button>
      </form> : <p className="notice">No practice roles are available right now. Try again later.</p>}
      {targetId && !target && <p className="form-error" role="alert">That target is no longer available. Choose a role from the current catalog.</p>}
    </section>
    {!profile.skills.length && <aside className="notice learning-note">Your saved profile has no skills yet, so every requirement will appear as a gap. <Link href="/account">Add your current skills</Link> to narrow the plan.</aside>}
    {target && plan ? <>
      <section className="learning-summary" aria-labelledby="learning-plan-heading">
        <div><p className="eyebrow">YOUR PRACTICE PLAN</p><h2 id="learning-plan-heading">{target.title}</h2><p>{plan.steps.length} {plan.steps.length === 1 ? "skill gap" : "skill gaps"} based on your saved, self-reported profile. Refresh after saving profile changes.</p></div>
        <Link className="button" href="/account">Review my skills</Link>
      </section>
      <p className="muted-note">Exercises are written by CareerForge. roadmap.sh links open the original learning resources; no content or progress is imported. Work through the steps at your own pace. Completing an exercise does not verify a skill or add it to your CV.</p>
      {plan.steps.length ? <ol className="learning-steps">{plan.steps.map((step, index) => <li className="panel learning-step" key={step.skill}>
        <div className="learning-step-heading"><span className="learning-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><p className="eyebrow">MISSING FROM YOUR PROFILE</p><h3>{step.skill}</h3></div></div>
        <p className="learning-reason">Why this step: {target.title} lists {step.skill}, and it is absent from your saved skills. Steps follow the role’s requirement order.</p>
        <dl><div><dt>Focus on</dt><dd>{step.topics}</dd></div><div><dt>Build this</dt><dd>{step.task}</dd></div><div><dt>Ready for review when</dt><dd>{step.doneWhen}</dd></div></dl>
        <div className="learning-resource">{step.resource ? <a className="text-button" href={step.resource.url} target="_blank" rel="noopener noreferrer">{step.resource.title} on roadmap.sh <span className="sr-only">(opens in a new tab)</span><span aria-hidden="true">↗</span></a> : <p className="muted-note">No reviewed roadmap.sh link is available for this skill yet. Use the exercise and seek feedback from a qualified reviewer.</p>}</div>
      </li>)}</ol> : <div className="empty-state learning-empty"><h3>No missing skills for this target.</h3><p>Your profile lists every required skill. This is self-reported coverage, not proof of proficiency. Practice with a different role or review the supported fundamentals checks.</p><Link href="/skill-checks" className="button">Explore skill checks</Link></div>}
      <aside className="learning-note muted-note">This pilot rebuilds the plan from your saved skills and selected target. The target stays in this page’s URL; completion tracking, saved schedules and adaptive monthly plans are still planned.</aside>
    </> : jobs.length > 0 && <div className="empty-state learning-empty"><h2>A useful next step starts with a target.</h2><p>Select a role above to see exercises for the skills missing from your profile.</p></div>}
  </div>;
}
