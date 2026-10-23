import type { AccountProfile } from "@/lib/account/schemas";

export function ProfileCV({ profile, passedSkills = [] }: { profile: AccountProfile; passedSkills?: string[] }) {
  const skills = profile.skills.filter(skill => passedSkills.includes(skill));
  const sections = [["Profile", profile.bio], ["Education", profile.education], ["Featured project", profile.project]];
  return <article className="cv-sheet" aria-label="CV preview">
    <header><h2>{profile.name}</h2>{profile.headline && <p className="cv-headline">{profile.headline}</p>}{profile.location && <p className="cv-location">{profile.location}</p>}</header>
    {sections.filter(([, value]) => value.trim()).map(([title, value]) => <section key={title}><h3>{title}</h3><p>{value}</p></section>)}
    {skills.length > 0 && <section><h3>Skills</h3><ul className="cv-skills">{skills.map(skill => <li key={skill}>{skill}</li>)}</ul></section>}
  </article>;
}
