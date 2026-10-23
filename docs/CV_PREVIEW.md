# Private saved-profile CV preview

Final verification: lint, TypeScript, 50 local tests and production build passed.
Live flow assertions and cleanup completed; Edge process shutdown was slow.

Open My profile, save the details you want included, then choose **Preview your
saved-profile CV** (or open `/cv`). The page reads the verified account's saved
profile through its authenticated Supabase client. It includes only entered name,
headline, location, biography, education/project summaries and skills; empty
sections are omitted. No generated qualifications or demonstration profile data
are inserted. Saved source data remains unchanged by previewing or printing.

Choose **Print / save as PDF**, then use the browser print dialog's PDF destination.
Review pagination, margins, paper size and browser header/footer settings before
sharing. The print stylesheet hides application controls and prints the document
on a white background. No document is publicly hosted or uploaded by this flow.

This is a basic M6 increment. CV upload/parsing, contact fields, normalized work
history, templates, persisted versions, CV-to-job scoring, AI tailoring and public
portfolio are not implemented by this page. Do not mark M6 complete from it.

Verification: unit rendering covers source fidelity/omitted empty sections and
escaped markup. The development temporary-account test verifies saved name/skills,
no-store/noindex, 320/1440 reflow, print controls hidden and nonempty PDF output.
Anonymous browser access redirects to login without a private document. A raw
HTTP request initially appeared to remain at `/cv`: Next streams the redirect
after rendering begins; the browser check verified its login destination and the
raw response contained no private article. The narrow screenshot was reviewed.
The same live run passed existing two-user ownership, persistence, tracker error
and conflict recovery, password updates and logout; temporary identities were
removed. No email or LLM requests were sent. Real inbox flows, mobile print-dialog
behavior and cross-browser PDF rendering remain unverified.
