# CareerForge — Chat Summary

*Updated 13 October 2026*

## Project idea

CareerForge is a capstone application that helps students and early-career job seekers build a credible career profile, see relevant job opportunities, identify skill gaps, improve their portfolio and CV, and manage applications. The longer-term vision adds AI to assess evidence for claims, personalize learning and application materials, and assist with job applications.

The design report discussed in this chat is a 39-page software engineering report. Its proposed stack includes Next.js with TypeScript, React Native, Supabase/PostgreSQL, Prisma, and an LLM API. We initially rated the idea **82/100 as a proposal**, mainly because the proposed scope is large; that is not a grade for a finished product.

## First month: basic MVP with no AI

Two teammates have one month to show their professor a usable application. **There is no AI in the first month.** The agreed practical scope is:

1. User registration and login.
2. Editable profile with education, projects, and self-reported skills.
3. Job listings entered or seeded by an admin.
4. Simple deterministic matching between a user's skills and job requirements, including missing skills.
5. Save jobs and manually track application status.
6. Connect, test, and deploy the web app for demonstration.

Keep assessment, live AI search, tailored CV generation, automatic submission, mobile, and other advanced features for later phases. The MVP should be honest about skill claims: a listed skill is self-reported unless evidence has actually been checked.

## Planned features after the MVP

| Area | Intended experience | Important constraint |
| --- | --- | --- |
| Portfolio and CV | Generate a portfolio and tailor a CV to a specific opening using the user's actual profile and CV. | Do not invent qualifications or experience. |
| Claim assessment | Ask timed, skill-specific questions or practical tasks; use the results and submitted evidence to assess claims. | An AI assessment is a limited signal, not proof of identity or mastery. |
| Live jobs | User selects role, location, and preferences; the app searches current listings, deduplicates them, and ranks matches. | Search coverage depends on accessible sources; no tool guarantees every available job. |
| Application assistance | Prepare a job-specific CV, cover letter, and answers; submit where authorized and technically supported; track outcomes. | Each site has different access rules, forms, and permissions. |
| Learning roadmap | Show concrete steps toward a role alongside relevant market demand and skill gaps. | Use permitted content or original roadmap material. |
| Workshops | Work with trainers and issue certificates for completed workshops. | A workshop certificate should state what was completed; stronger credential claims need suitable checks. |
| Interview preparation | Practice likely interview questions with feedback. | Feedback is coaching, not an employer decision. |

## Evaluating skills across CS fields

The team cannot hand-author expert questions for every computer science field. A later AI system could generate assessments from a structured skill taxonomy and a rubric, then evaluate responses provisionally. For coding skills, practical tasks with executable checks and a follow-up explanation or modification are stronger than a short multiple-choice quiz alone. Start with a few high-demand skills and expand after checking question quality and scoring consistency.

Different claims need different evidence:

- **Coding skill:** practical exercise, explanation, and optionally linked project or repository.
- **Degree:** document and, where possible, issuer verification; a quiz cannot establish a degree.
- **Language proficiency:** suitable language assessment or external credential; a general AI conversation gives only an estimate.
- **Course or workshop:** attendance and completion records; issuer-backed certificate when available.

Use clear status labels such as **self-reported**, **evidence provided**, **AI-assessed**, and **issuer-verified** only when the corresponding check happened. Detecting pasted text does not reliably prove AI use, and a time limit does not prevent cheating. Treat paste and timing as signals, allow accessibility needs, and use adaptive follow-up questions before changing a claim's status.

## Job discovery and application limits

The desired flow is: choose a kind of job in the Job Postings page → search current openings → verify and deduplicate results → show matches → prepare a truthful tailored CV → assist with or submit the application when permitted.

An LLM can reason over and summarize job listings, but it needs a search or browsing tool to retrieve current openings. Search APIs typically require an API key for billing, limits, and abuse control. Paying increases search capacity and source breadth; it does **not** grant access to every job or permission to apply on every platform. Some openings are private, unindexed, behind logins, or published in formats unavailable to the app.

We discussed combining public job feeds and employer applicant-tracking-system boards (for example, public Greenhouse and Lever listings) with a paid web-search API for broader discovery. Return the original job link and follow each source's access and reuse terms. LinkedIn is a particular constraint: displaying or automating its jobs through unofficial scraping is not a reliable foundation for this product. An employer's public board may expose job listings but require an employer-owned credential to submit applications programmatically. On unsupported sites, the app can hand the prepared materials to the user for review and manual submission.

## Cost discussion for a small pilot

For roughly 8–10 friends and the professor, the projected search volume is small. An earlier illustration used 11 users × one daily search × 30 days × three search requests = **990 search requests/month**. At the Brave Search price discussed then ($5 per 1,000 requests, with $5 monthly credit), that example fit within the credit; paying $20 would buy extra search capacity, not complete job coverage. API pricing and terms should be checked again before implementation.

Using the DeepSeek chat product for free does not make an application's DeepSeek API calls free. Actual AI cost depends on model, input and output tokens, retries, and assessment/application volume. AI cost is outside the first-month MVP.

## Working decisions and next implementation step

- Build a usable **web MVP without AI** first, with a short list of seeded jobs and transparent deterministic matching.
- Keep later assessment statuses precise; never present an AI quiz as proof of a degree or absolute proof of a skill.
- For the full product, make live discovery and application submission separate capabilities: finding a listing does not imply permission or technical ability to submit it.
- Next, turn the MVP into a shared backlog for the two teammates, agree on data models and page contracts, and integrate a demo early enough to test before the professor's deadline.

## Open questions

1. Which specific pages, data fields, and deployment target does the professor require for the one-month deliverable?
2. Which CS roles and skills should the first later-phase assessment cover?
3. Which job sources and regions are in scope for the first live-search release?
4. Which application sites will support authorized submission, and which will remain assisted/manual?
5. Who reviews assessment question quality and handles appeals or disputed results?
