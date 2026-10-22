# CareerForge contribution guidance

- Start with `docs/IMPLEMENTATION_ROADMAP.md` for current status, task order,
  acceptance criteria and release gates. Update its status/evidence when work
  changes, and commit useful increments with benefit-oriented messages.

- Use Next.js App Router, React, TypeScript strict mode, Tailwind CSS, Supabase SSR, and Prisma 7.
- Keep the first release as a small web MVP without AI, mobile/Expo, or unrelated infrastructure.
- Use Route Handlers in Next.js for backend endpoints; do not add a separate backend.
- Keep Supabase publishable values in the browser only where supported. Never expose database passwords or service-role keys.
- Prisma access is server-side and does not inherit Supabase Auth RLS automatically. Do not add unrestricted data endpoints.
- Keep changes small, typed, and easy for two teammates to review. Add tests and documentation when behavior requires them.
