export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          CareerForge
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Build a clearer path to your next opportunity.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          The web MVP foundation is ready. Profiles, job discovery, skill
          matching, saved jobs, and application tracking will be added in
          focused increments.
        </p>
        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
          <p className="font-medium text-slate-100">Foundation status</p>
          <p className="mt-2 text-sm">
            Next.js, Tailwind CSS, Supabase SSR, and Prisma are configured.
            Authentication and database models are intentionally pending.
          </p>
        </div>
      </section>
    </main>
  );
}
