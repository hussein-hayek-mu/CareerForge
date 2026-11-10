import type { AccountProfile } from "@/lib/account/schemas";
import type { ProfileHistory } from "@/lib/profile-history";
import { formatHistoryGpa, formatHistoryPeriod } from "@/lib/profile-history-format";

const emptyHistory: ProfileHistory = { education: [], experience: [] };

export function ProfileCV({ profile, passedSkills = [], history = emptyHistory }: {
  profile: AccountProfile; passedSkills?: string[]; history?: ProfileHistory;
}) {
  const skills = profile.skills.filter(skill => passedSkills.includes(skill));
  const summaries = [["Education summary", profile.education], ["Featured project summary", profile.project]];
  return <article className="cv-sheet" aria-label="CV preview">
    <header><h2>{profile.name}</h2>{profile.headline && <p className="cv-headline">{profile.headline}</p>}{profile.location && <p className="cv-location">{profile.location}</p>}</header>
    {profile.bio.trim() && <section><h3>Profile</h3><p>{profile.bio}</p></section>}
    {history.experience.length > 0 && <section className="cv-history-section">
      <h3>Work experience</h3><p className="cv-history-note">Self-reported; not independently verified.</p>
      {history.experience.map(record => <div className="cv-history-entry" key={record.id}>
        <h4>{record.role}</h4><p>{record.company}</p><p className="cv-history-period">{formatHistoryPeriod(record)}</p>
        {record.description.trim() && <p className="cv-history-description">{record.description}</p>}
      </div>)}
    </section>}
    {history.education.length > 0 && <section className="cv-history-section">
      <h3>Education history</h3><p className="cv-history-note">Self-reported; not independently verified.</p>
      {history.education.map(record => {
        const gpa = formatHistoryGpa(record);
        return <div className="cv-history-entry" key={record.id}>
          <h4>{record.institution}</h4><p>{record.degree}</p><p className="cv-history-period">{formatHistoryPeriod(record)}</p>
          {gpa && <p>{gpa}</p>}
        </div>;
      })}
    </section>}
    {summaries.filter(([, value]) => value.trim()).map(([title, value]) => <section key={title}><h3>{title}</h3><p>{value}</p></section>)}
    {skills.length > 0 && <section><h3>Skills</h3><ul className="cv-skills">{skills.map(skill => <li key={skill}>{skill}</li>)}</ul></section>}
  </article>;
}
