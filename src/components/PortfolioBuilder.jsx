"use client";
// components/PortfolioBuilder.jsx
// app/page.jsx ->  import PortfolioBuilder from "@/components/PortfolioBuilder"; export default () => <PortfolioBuilder />;

import { createContext, useContext, useEffect, useRef, useState } from "react";

/* ---------- Themes: add a line to add a theme ---------- */
const THEMES = {
  indigo:  { a: "#8b8fff", b: "#d08bff", bg: "#0a0c18" },
  emerald: { a: "#3ddc97", b: "#2bd4e8", bg: "#06120e" },
  rose:    { a: "#ff7a90", b: "#ffb347", bg: "#150910" },
  amber:   { a: "#ffc233", b: "#ff7a3d", bg: "#130e05" },
  sky:     { a: "#4cc2ff", b: "#8f9bff", bg: "#060e18" },
};
const ICONS = {
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  linkedin: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>,
  github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2m-15.07-7.07 1.41 1.41m9.32 9.32 1.41 1.41m0-12.14-1.41 1.41m-9.32 9.32-1.41 1.41" /></>,
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  arrow: <path d="m18 15-6-6-6 6" />,
};
const Icon = ({ n, s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[n]}</svg>
);
// [key, icon, label, placeholder]
const FIELDS = [
  ["email", "mail", "Email", "Add email"], ["phone", "phone", "Phone", "Add phone"],
  ["linkedin", "linkedin", "LinkedIn", "Add LinkedIn URL"], ["github", "github", "GitHub", "Add GitHub URL"],
  ["website", "globe", "Website", "Add website"], ["location", "pin", "Location", "Add location"],
];
const linkFor = (k, v) => !v ? undefined : k === "email" ? `mailto:${v}` : k === "phone" ? `tel:${v.replace(/[^\d+]/g, "")}` : k === "location" ? undefined : /^https?:/i.test(v) ? v : `https://${v}`;
const lum = (hex) => { const m = /^#?(..)(..)(..)$/.exec(hex); if (!m) return 0; const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const STEPS = ["Reading your notes…", "Structuring your experience…", "Polishing the wording…"];
const SAMPLE = `i'm sara khoury, frontend dev. worked at google for 2 yrs doing frontend, made dashboards faster. before that 1 yr intern at a startup in beirut, react stuff. know react, next, typescript, css, figma. built a weather app and an ecommerce site for my uncle.`;

// Example contact details so every icon is visible out of the box. Replace with your own.
const DEMO_CONTACT = { email: "sara.khoury@email.com", phone: "+1 555 010 0123", linkedin: "linkedin.com/in/sara-khoury", github: "github.com/sarakhoury", website: "sarakhoury.dev", location: "Open to remote" };

/* Offline fallback so the UI works with no API key */
function mockStructure(text) {
  const name = (text.match(/(?:i'?m|my name is)\s+([a-z ]+?)[,.]/i)?.[1] || "Your Name").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    name, role: "Front-End Developer", email: "", phone: "", linkedin: "", github: "", website: "", location: "Open to remote", education: [], languages: [],
    summary: "Front-end engineer who ships fast, accessible interfaces at scale. Two years at Google turning slow dashboards into tools people enjoy using.",
    experience: [
      { company: "Google", title: "Front-End Engineer", period: "2 years", bullets: ["Rebuilt data dashboards to load faster and read more clearly.", "Worked with design and product to ship accessible, polished interfaces."] },
      { company: "Beirut startup", title: "Front-End Intern", period: "1 year", bullets: ["Built React components used across the product.", "Learned code review, testing and agile delivery."] },
    ],
    skills: ["React", "Next.js", "TypeScript", "CSS", "Figma"],
    projects: [
      { name: "Weather App", description: "Responsive forecast app with live data and a clean, glanceable layout." },
      { name: "E-commerce Site", description: "Full storefront for a family business, from catalog to checkout." },
    ],
  };
}

async function structureWithAI(text) {
  const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (res.status === 501) return { data: mockStructure(text), demo: true };
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return { data: await res.json(), demo: false };
}

/* ---------- Click-to-edit text ---------- */
const EditCtx = createContext(() => {});
const ListCtx = createContext({});
function Ed({ v, p, as: T = "span", multi, ph = "Add text", cls = "" }) {
  const set = useContext(EditCtx);
  return (
    <T className={"ed " + cls} data-ph={ph} contentEditable suppressContentEditableWarning spellCheck={false}
      onBlur={(e) => set(p, e.currentTarget.textContent.trim())}
      onKeyDown={(e) => { if (!multi && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}>{v}</T>
  );
}

export default function PortfolioBuilder() {
  const [input, setInput] = useState(SAMPLE);
  const [data, setData] = useState(() => ({ ...mockStructure(SAMPLE), ...DEMO_CONTACT }));
  const [view, setView] = useState("portfolio");
  const [theme, setTheme] = useState("indigo");
  const [custom, setCustom] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState("dark");
  const [photo, setPhoto] = useState(null);
  const [cvPhoto, setCvPhoto] = useState(true);
  const [cvStyle, setCvStyle] = useState("modern");

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1400);
    return () => clearInterval(id);
  }, [busy]);

  const set = (path, val) => setData((d) => {
    const c = structuredClone(d); let o = c;
    path.slice(0, -1).forEach((k) => (o = o[k])); o[path.at(-1)] = val; return c;
  });

  const lists = {
    addSkill: () => setData((d) => ({ ...d, skills: [...d.skills, "New skill"] })),
    removeSkill: (i) => setData((d) => ({ ...d, skills: d.skills.filter((_, j) => j !== i) })),
    add: (key, item) => setData((d) => ({ ...d, [key]: [...(d[key] || []), item] })),
    remove: (key, i) => setData((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) })),
  };

  async function generate() {
    setBusy(true); setNote("");
    try {
      const { data, demo } = await structureWithAI(input);
      setData((prev) => ({ ...data, ...Object.fromEntries(["email", "phone", "linkedin", "github", "website", "location"].map((k) => [k, data[k] || prev[k] || ""])) }));
      setNote(demo ? "Demo mode: add ANTHROPIC_API_KEY to .env.local for real AI writing." : "Done. Click any text in the preview to fine-tune it.");
    } catch (e) { setNote("Couldn't generate: " + e.message); }
    finally { setBusy(false); }
  }

  const t = THEMES[theme];
  const a = custom || t.a;
  const light = mode === "light";
  const vars = {
    "--a": a,
    "--b": custom ? `color-mix(in srgb, ${custom} 55%, #ff7ad9)` : t.b,
    "--bg": light ? `color-mix(in srgb, ${a} 7%, #f6f7fc)` : custom ? `color-mix(in srgb, ${custom} 9%, #07080d)` : t.bg,
    "--on": lum(a) > 0.45 ? "#0a0a12" : "#ffffff", // readable text on accent fills
  };

  return (
    <EditCtx.Provider value={set}>
    <ListCtx.Provider value={lists}>
      <div className="pb" style={vars} data-mode={mode}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />

        <aside className="panel no-print">
          <h1>Turn rough notes into a portfolio and CV</h1>
          <p className="sub">Write it the way you'd tell a friend. The AI handles the polish.</p>
          <label htmlFor="raw">Your notes</label>
          <textarea id="raw" rows={10} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Where you worked, what you did, what you know, what you built…" />
          <div className="meta">
            <button className="link" onClick={() => setInput(SAMPLE)}>Use example</button>
            <span>{input.length} characters</span>
          </div>
          <button className="btn primary" onClick={generate} disabled={busy || !input.trim()}>
            {busy ? <><span className="spin" /> Writing…</> : "Generate with AI"}
          </button>
          {note && <p className="note" role="status">{note}</p>}
        </aside>

        <section className="stage">
          <div className="toolbar no-print">
            <div className="seg" role="tablist">
              <button role="tab" aria-selected={view === "portfolio"} className={view === "portfolio" ? "on" : ""} onClick={() => setView("portfolio")}>Web portfolio</button>
              <button role="tab" aria-selected={view === "cv"} className={view === "cv" ? "on" : ""} onClick={() => setView("cv")}>CV</button>
            </div>
            <div className="swatches" aria-label="Accent color">
              {Object.entries(THEMES).map(([k, v]) => (
                <button key={k} title={k} aria-label={k} aria-pressed={!custom && theme === k}
                  className={!custom && theme === k ? "sw on" : "sw"} style={{ background: `linear-gradient(135deg, ${v.a}, ${v.b})` }}
                  onClick={() => { setTheme(k); setCustom(null); }} />
              ))}
              <label className={custom ? "sw custom on" : "sw custom"} title="Custom color">
                <input type="color" aria-label="Custom color" value={custom || t.a} onChange={(e) => setCustom(e.target.value)} />
              </label>
            </div>
            <button className="modebtn" aria-label={`Switch to ${light ? "dark" : "light"} mode`} title={light ? "Dark mode" : "Light mode"} onClick={() => setMode(light ? "dark" : "light")}>
              <Icon n={light ? "moon" : "sun"} />
            </button>
            {view === "cv" && (
              <div className="dl">
                <div className="seg" role="tablist" aria-label="CV style">
                  <button role="tab" aria-selected={cvStyle === "modern"} className={cvStyle === "modern" ? "on" : ""} onClick={() => setCvStyle("modern")}>Modern</button>
                  <button role="tab" aria-selected={cvStyle === "ats"} className={cvStyle === "ats" ? "on" : ""} onClick={() => setCvStyle("ats")}>ATS-safe</button>
                </div>
                {cvStyle === "modern" && <label className="chk"><input type="checkbox" checked={cvPhoto} disabled={!photo} onChange={(e) => setCvPhoto(e.target.checked)} /> Photo on CV</label>}
                <button className="btn sm" onClick={() => window.print()}>Download PDF</button>
                <small>Prints on A4 with no margins. Use ATS-safe for online application forms.</small>
              </div>
            )}
          </div>
          <p className="hint no-print">Click any text in the preview to edit it.</p>

          <div className={"preview" + (busy ? " busy" : "")}>
            {view === "portfolio" ? <Portfolio d={data} photo={photo} setPhoto={setPhoto} onCV={() => { setView("cv"); setTimeout(() => window.print(), 450); }} /> : <CV d={data} photo={cvPhoto ? photo : null} variant={cvStyle} />}
          </div>
          {busy && <div className="status" role="status"><span className="spin dark" />{STEPS[step]}</div>}
        </section>
      </div>
    </ListCtx.Provider>
    </EditCtx.Provider>
  );
}

/* ---------- View A: dark glass portfolio ---------- */
const clearFx = (el) => el && ["--rx", "--ry", "--tx", "--ty"].forEach((k) => el.style.removeProperty(k));
const NAV = ["about", "experience", "skills", "projects", "contact"];
function Portfolio({ d, photo, setPhoto, onCV }) {
  const ref = useRef(null);
  const [active, setActive] = useState("about");
  const { addSkill, removeSkill } = useContext(ListCtx);

  // Scroll progress bar + back-to-top visibility (DOM updates only, no re-renders)
  useEffect(() => {
    const sc = ref.current.closest(".preview");
    let raf = 0;
    const read = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const own = sc.scrollHeight > sc.clientHeight + 2;
        const top = own ? sc.scrollTop : scrollY;
        const max = own ? sc.scrollHeight - sc.clientHeight : document.documentElement.scrollHeight - innerHeight;
        const p = max > 0 ? Math.min(top / max, 1) : 0;
        ref.current.querySelector(".prog")?.style.setProperty("transform", `scaleX(${p})`);
        ref.current.querySelector(".totop")?.classList.toggle("show", p > 0.08);
      });
    };
    sc.addEventListener("scroll", read, { passive: true }); addEventListener("scroll", read, { passive: true });
    return () => { cancelAnimationFrame(raf); sc.removeEventListener("scroll", read); removeEventListener("scroll", read); };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.dataset.sec) setActive(e.target.dataset.sec);
    }), { threshold: 0.3 });
    ref.current.querySelectorAll(".rv,[data-sec]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [d.experience.length, d.projects.length]);

  const last = useRef(null);
  const glow = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--px", e.clientX - r.left + "px");
    e.currentTarget.style.setProperty("--py", e.clientY - r.top + "px");
    const fx = e.target.closest?.(".fx");
    if (last.current && last.current !== fx) clearFx(last.current);
    last.current = fx;
    if (!fx) return;
    const b = fx.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    fx.style.setProperty("--mx", x + "px");
    fx.style.setProperty("--my", y + "px");
    if (fx.dataset.tilt) {
      fx.style.setProperty("--ry", (x / b.width - 0.5) * 12 + "deg");
      fx.style.setProperty("--rx", (0.5 - y / b.height) * 12 + "deg");
    }
    if (fx.dataset.mag) {
      fx.style.setProperty("--tx", (x / b.width - 0.5) * 10 + "px");
      fx.style.setProperty("--ty", (y / b.height - 0.5) * 8 + "px");
    }
  };
  const go = (id) => ref.current.querySelector(`[data-sec="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="port" ref={ref} onMouseMove={glow} onMouseLeave={() => clearFx(last.current)}>
      <Bg />
      <nav className="pnav glass" aria-label="Sections">
        {NAV.map((n) => <button key={n} className={active === n ? "on" : ""} onClick={() => go(n)}>{n[0].toUpperCase() + n.slice(1)}</button>)}
      </nav>

      <header className="hero" data-sec="about">
        <div className="hero-txt">
          <p className="role"><Ed v={d.role} p={["role"]} /></p>
          <Ed as="h2" v={d.name} p={["name"]} />
          <Ed as="p" multi cls="lead" v={d.summary} p={["summary"]} />
          <div className="socials">
            {FIELDS.filter(([k]) => k !== "location" && d[k]).map(([k, ic, label]) => (
              <a key={k} className="soc" href={linkFor(k, d[k])} target={k === "email" || k === "phone" ? undefined : "_blank"} rel="noreferrer" aria-label={label} title={label}><Icon n={ic} s={20} /></a>
            ))}
          </div>
          <div className="cta">
            <button className="btn primary" onClick={() => go("contact")}>Get in touch</button>
            <button className="btn" onClick={onCV}>Download CV</button>
          </div>
        </div>
        <Avatar photo={photo} setPhoto={setPhoto} name={d.name} />
      </header>

      <section data-sec="experience">
        <h3>Where I've worked</h3>
        <ol className="tl">
          {d.experience.map((x, i) => (
            <li key={i} className="rv" style={{ "--i": i }}>
              <div className="when"><Ed v={x.period} p={["experience", i, "period"]} /></div>
              <div className="glass card fx">
                <h4><Ed v={x.title} p={["experience", i, "title"]} /> <em>at <Ed v={x.company} p={["experience", i, "company"]} /></em></h4>
                <ul>{x.bullets.map((b, j) => <li key={j}><Ed multi v={b} p={["experience", i, "bullets", j]} /></li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {d.education?.length > 0 && (
        <section data-sec="education">
          <h3>Education</h3>
          <div className="grid">
            {d.education.map((e, i) => (
              <article key={i} className="glass card fx rv" style={{ "--i": i }}>
                <h4><Ed v={e.degree} p={["education", i, "degree"]} ph="Degree" /></h4>
                <p><Ed v={e.school} p={["education", i, "school"]} ph="School" />&nbsp;/&nbsp;<Ed v={e.period} p={["education", i, "period"]} ph="Years" /></p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section data-sec="skills">
        <h3>What I work with</h3>
        <div className="chips">
          {d.skills.map((s, i) => <span key={i} className="chip fx rv" data-mag="1" style={{ "--i": i }}><Ed v={s} p={["skills", i]} ph="Skill" /><button className="sk-x" onClick={() => removeSkill(i)} aria-label={`Remove ${s}`}>×</button></span>)}
          <button className="chip sk-add" onClick={addSkill}>+ Add skill</button>
        </div>
      </section>

      <section data-sec="projects">
        <h3>Things I've built</h3>
        <div className="grid">
          {d.projects.map((p, i) => (
            <article key={i} className="glass card big fx rv" data-tilt="1" style={{ "--i": i }}>
              <Ed as="h4" v={p.name} p={["projects", i, "name"]} />
              <Ed as="p" multi v={p.description} p={["projects", i, "description"]} />
            </article>
          ))}
        </div>
      </section>

      <footer data-sec="contact" className="contact">
        <h3>Let's work together</h3>
        <div className="cpills">
          {FIELDS.map(([k, ic, label, ph]) => (
            <div key={k} className={"cpill glass" + (d[k] ? "" : " empty")}>
              <a className="cico" href={linkFor(k, d[k])} target={k === "email" || k === "phone" ? undefined : "_blank"} rel="noreferrer" aria-label={label} tabIndex={linkFor(k, d[k]) ? 0 : -1}><Icon n={ic} /></a>
              <Ed v={d[k]} p={[k]} ph={ph} />
            </div>
          ))}
        </div>
        {d.email && <a className="btn primary" href={`mailto:${d.email}`}>Email me</a>}
      </footer>
      <p className="copy">© {new Date().getFullYear()} {d.name}</p>
      <div className="totop-wrap">
        <button className="totop glass" aria-label="Back to top" onClick={() => go("about")}><Icon n="arrow" s={18} /></button>
      </div>
    </div>
  );
}

/* ---------- Animated background: drifting aurora + interactive particle web ---------- */
function Bg() {
  const cv = useRef(null);
  useEffect(() => {
    const c = cv.current, ctx = c.getContext("2d");
    const port = c.closest(".port"), sc = c.closest(".preview");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, pts = [], rip = [], star = null, raf = 0, t = 0, next = 240;
    let tx = -999, ty = -999, mx = -999, my = -999, sy = 0, c1 = "#8b8fff", c2 = "#d08bff";
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = port.clientWidth; h = Math.min(sc?.clientHeight || innerHeight, innerHeight);
      c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // z = depth: far dots are small, dim and slow; near dots are larger and brighter
      pts = Array.from({ length: Math.min(110, Math.floor((w * h) / 14000)) }, () => {
        const z = 0.25 + Math.random() * 0.75;
        return { x: Math.random() * w, y: Math.random() * h, z, r: 0.5 + z * 1.7, vx: (Math.random() - 0.5) * 0.3 * z, vy: (Math.random() - 0.5) * 0.3 * z, ph: Math.random() * 6.28, px: 0, py: 0 };
      });
    };
    const rel = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const move = (e) => { [tx, ty] = rel(e); if (mx < -900) { mx = tx; my = ty; } };
    const away = () => { tx = ty = -999; };
    const down = (e) => { const [x, y] = rel(e); if (y >= 0 && y <= h && rip.length < 4) rip.push({ x, y, r: 0 }); };
    const draw = () => {
      t++;
      if (t % 45 === 1) { const cs = getComputedStyle(c); c1 = cs.getPropertyValue("--at").trim() || c1; c2 = cs.getPropertyValue("--b").trim() || c2; }
      const own = sc && sc.scrollHeight > sc.clientHeight + 2;
      sy += ((own ? sc.scrollTop : scrollY) - sy) * 0.08; // eased scroll drives parallax
      if (tx < -900) mx = my = -999; else { mx += (tx - mx) * 0.14; my += (ty - my) * 0.14; }
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!reduce) { p.x += p.vx; p.y = (p.y + p.vy + h) % h; if (p.x < 0 || p.x > w) p.vx *= -1; }
        p.px = p.x; p.py = (((p.y - sy * p.z * 0.35) % h) + h) % h;
        const dx = p.px - mx, dy = p.py - my, d = Math.hypot(dx, dy);
        if (!reduce && d > 0 && d < 120) { const f = ((120 - d) / 120) * 2 * p.z; p.x += (dx / d) * f; p.y += (dy / d) * f; }
      }
      ctx.fillStyle = ctx.strokeStyle = c1; ctx.lineWidth = 1;
      for (const p of pts) {
        ctx.globalAlpha = (0.3 + 0.6 * p.z) * (0.75 + 0.25 * Math.sin(t * 0.03 + p.ph)); // twinkle
        ctx.beginPath(); ctx.arc(p.px, p.py, p.r, 0, 6.283); ctx.fill();
      }
      const near = pts.filter((p) => p.z > 0.55); // only the front layer is linked, so the web stays calm
      for (let i = 0; i < near.length; i++) {
        const a = near[i];
        for (let j = i + 1; j < near.length; j++) {
          const b = near[j], d = Math.hypot(a.px - b.px, a.py - b.py);
          if (d < 120) { ctx.globalAlpha = (1 - d / 120) * 0.22; ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke(); }
        }
        const dm = Math.hypot(a.px - mx, a.py - my);
        if (dm < 170) { ctx.strokeStyle = c2; ctx.globalAlpha = (1 - dm / 170) * 0.7; ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(mx, my); ctx.stroke(); ctx.strokeStyle = c1; }
      }
      rip = rip.filter((q) => q.r < 180);
      for (const q of rip) { q.r += 4; ctx.strokeStyle = c2; ctx.globalAlpha = (1 - q.r / 180) * 0.5; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.stroke(); }
      if (!reduce && !star && --next <= 0) { star = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.35, l: 1 }; next = 360 + Math.random() * 360; }
      if (star) {
        ctx.strokeStyle = c2;
        for (let k = 0; k < 9; k++) { ctx.globalAlpha = star.l * (1 - k / 9) * 0.8; ctx.lineWidth = 1.6 * (1 - k / 12); ctx.beginPath(); ctx.moveTo(star.x - 11 * k, star.y - 5 * k); ctx.lineTo(star.x - 11 * (k + 1), star.y - 5 * (k + 1)); ctx.stroke(); }
        star.x += 11; star.y += 5; star.l -= 0.012; ctx.lineWidth = 1;
        if (star.l <= 0 || star.x > w + 100) star = null;
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    size(); draw();
    const ro = new ResizeObserver(() => { size(); if (reduce) draw(); }); ro.observe(port);
    addEventListener("pointermove", move); addEventListener("pointerdown", down); document.addEventListener("pointerleave", away);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener("pointermove", move); removeEventListener("pointerdown", down); document.removeEventListener("pointerleave", away); };
  }, []);
  return (
    <div className="bg" aria-hidden="true">
      <div className="prog" />
      <div className="aurora"><i /><i /><i /></div>
      <canvas ref={cv} />
    </div>
  );
}

/* ---------- Photo: click or drop an image ---------- */
function Avatar({ photo, setPhoto, name }) {
  const input = useRef(null);
  const pick = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result);
    r.readAsDataURL(f);
  };
  const initials = (name || "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="avatar fx" data-tilt="1">
      <button className="av-btn" onClick={() => input.current.click()} aria-label={photo ? "Change photo" : "Add photo"}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
        {photo ? <img src={photo} alt={name || "Profile photo"} /> : <span className="ph"><b>{initials || "?"}</b><small>Add your photo</small></span>}
        <span className="av-over"><Icon n="camera" s={16} />{photo ? "Change photo" : "Upload photo"}</span>
      </button>
      {photo && <button className="av-x" onClick={() => setPhoto(null)} aria-label="Remove photo">×</button>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />
    </div>
  );
}

/* ---------- View B: ATS-friendly CV (single column, semantic, no icons or tables) ---------- */
function CV({ d, photo, variant }) {
  const { addSkill, add } = useContext(ListCtx);
  if (variant === "modern") return <CVModern d={d} photo={photo} />;
  return (
    <div className="cv-wrap">
      <article className="cv ats">
        {photo && <img className="cv-photo" src={photo} alt="" />}
        <Ed as="h1" v={d.name} p={["name"]} />
        <p className="cv-role"><Ed v={d.role} p={["role"]} /></p>
        <p className="contact-line">
          {FIELDS.filter(([k]) => d[k]).map(([k, ic], i) => (
            <span key={k} className="cl">{i > 0 && <span className="sep"> | </span>}<Icon n={ic} s={13} /><Ed v={d[k]} p={[k]} /></span>
          ))}
        </p>
        <h2>Summary</h2>
        <Ed as="p" multi v={d.summary} p={["summary"]} />
        <h2>Experience</h2>
        {d.experience.map((x, i) => (
          <div key={i} className="cv-job">
            <p className="cv-row"><strong><Ed v={x.title} p={["experience", i, "title"]} />, <Ed v={x.company} p={["experience", i, "company"]} /></strong><Ed v={x.period} p={["experience", i, "period"]} /></p>
            <ul>{x.bullets.map((b, j) => <li key={j}><Ed multi v={b} p={["experience", i, "bullets", j]} /></li>)}</ul>
          </div>
        ))}
        {d.education?.length > 0 && <><h2>Education</h2>{d.education.map((e, i) => <p key={i} className="cv-row"><span><strong><Ed v={e.degree} p={["education", i, "degree"]} ph="Degree" /></strong>, <Ed v={e.school} p={["education", i, "school"]} ph="School" /></span><Ed v={e.period} p={["education", i, "period"]} ph="Years" /></p>)}</>}
        <button className="sk-add ats no-print" onClick={() => add("education", { school: "School", degree: "Degree", period: "Years" })}>+ Add education</button>
        <h2>Skills</h2>
        <p>
          {d.skills.map((s, i) => ({ s, i })).filter((x) => x.s).map(({ s, i }, n, arr) => (
            <span key={i}><Ed v={s} p={["skills", i]} />{n < arr.length - 1 ? ", " : ""}</span>
          ))}
          <button className="sk-add ats no-print" onClick={addSkill}>+ Add</button>
        </p>
        {d.languages?.length > 0 && <><h2>Languages</h2><p>{d.languages.map((s, i) => <span key={i}><Ed v={s} p={["languages", i]} />{i < d.languages.length - 1 ? ", " : ""}</span>)}</p></>}
        <button className="sk-add ats no-print" onClick={() => add("languages", "Language")}>+ Add language</button>
        <h2>Projects</h2>
        {d.projects.map((p, i) => <p key={i}><strong><Ed v={p.name} p={["projects", i, "name"]} />.</strong> <Ed multi v={p.description} p={["projects", i, "description"]} /></p>)}
      </article>
    </div>
  );
}

function Edu({ e, i }) {
  const { remove } = useContext(ListCtx);
  return (
    <div className="edu">
      <p className="cv-row"><strong><Ed v={e.school} p={["education", i, "school"]} ph="School" /></strong><span className="per"><Ed v={e.period} p={["education", i, "period"]} ph="Years" /></span></p>
      <p className="edu-d"><Ed v={e.degree} p={["education", i, "degree"]} ph="Degree" /></p>
      <button className="ed-x no-print" onClick={() => remove("education", i)} aria-label="Remove education">×</button>
    </div>
  );
}

function Skill({ s, i, k = "skills" }) {
  const { remove } = useContext(ListCtx);
  return (
    <span className="mx-skill">
      <Ed v={s} p={[k, i]} ph="Skill" />
      <button className="sk-x no-print" onClick={() => remove(k, i)} aria-label={`Remove ${s}`}>×</button>
    </span>
  );
}

/* Modern CV: sidebar + timeline. Reading order: main content first, sidebar placed on the left by CSS. */
function CVModern({ d, photo }) {
  const [open, setOpen] = useState(null);
  const cur = FIELDS.find(([k]) => k === open);
  const { addSkill } = useContext(ListCtx);
  const { add } = useContext(ListCtx);
  return (
    <div className="cv-wrap">
      <article className="cv modern">
        <div className="cv-main">
          <Ed as="h1" v={d.name} p={["name"]} />
          <p className="cv-role"><Ed v={d.role} p={["role"]} /></p>
          <div className="cbar no-print">
            <div className="cicons" role="tablist" aria-label="Contact details">
              {FIELDS.map(([k, ic, label]) => (
                <button key={k} role="tab" aria-selected={open === k} title={label} aria-label={label}
                  className={"cib" + (open === k ? " on" : "") + (d[k] ? "" : " empty")} onClick={() => setOpen(open === k ? null : k)}>
                  <Icon n={ic} s={17} />
                </button>
              ))}
            </div>
            <div className="cdetail" key={open || "none"} aria-live="polite">
              {cur ? (
                <>
                  <span className="cd-l">{cur[2]}</span>
                  <Ed v={d[cur[0]]} p={[cur[0]]} ph={cur[3]} />
                  {linkFor(cur[0], d[cur[0]]) && <a className="cd-go" href={linkFor(cur[0], d[cur[0]])} target={cur[0] === "email" || cur[0] === "phone" ? undefined : "_blank"} rel="noreferrer">Open</a>}
                </>
              ) : <span className="cd-hint">Tap an icon to see contact details</span>}
            </div>
          </div>
          {/* Print version: every filled detail is visible on paper */}
          <ul className="cprint">
            {FIELDS.filter(([k]) => d[k]).map(([k, ic]) => (
              <li key={k}><Icon n={ic} s={13} />{linkFor(k, d[k]) ? <a href={linkFor(k, d[k])}>{d[k]}</a> : d[k]}</li>
            ))}
          </ul>
          <h2>Profile</h2>
          <Ed as="p" multi v={d.summary} p={["summary"]} />
          <h2>Experience</h2>
          <div className="mx-tl">
            {d.experience.map((x, i) => (
              <div key={i} className="mx-job">
                <p className="cv-row"><strong><Ed v={x.title} p={["experience", i, "title"]} /></strong><span className="per"><Ed v={x.period} p={["experience", i, "period"]} /></span></p>
                <p className="mx-co"><Ed v={x.company} p={["experience", i, "company"]} /></p>
                <ul>{x.bullets.map((b, j) => <li key={j}><Ed multi v={b} p={["experience", i, "bullets", j]} /></li>)}</ul>
              </div>
            ))}
          </div>
          <h2>Projects</h2>
          {d.projects.map((p, i) => <p key={i}><strong><Ed v={p.name} p={["projects", i, "name"]} /></strong> <Ed multi v={p.description} p={["projects", i, "description"]} /></p>)}
          {d.education?.length > 0 && <h2>Education</h2>}
          {d.education?.map((e, i) => <Edu key={i} e={e} i={i} />)}
          <button className="sk-add ats no-print" onClick={() => add("education", { school: "School", degree: "Degree", period: "Years" })}>+ Add education</button>
        </div>
        <aside className="cv-side">
          {photo && <img className="mx-photo" src={photo} alt="" />}
          
          <h3>Skills</h3>
          <div className="mx-skills">
            {d.skills.map((s, i) => <Skill key={i} s={s} i={i} />)}
            <button className="sk-add no-print" onClick={addSkill}>+ Add skill</button>
          </div>
          <h3 className={d.languages?.length ? "" : "no-print"}>Languages</h3>
          <div className="mx-skills">
            {(d.languages || []).map((s, i) => <Skill key={i} s={s} i={i} k="languages" />)}
            <button className="sk-add no-print" onClick={() => add("languages", "Language")}>+ Add language</button>
          </div>
        </aside>
      </article>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Inter:wght@400;500;600&display=swap');
.pb{--ink:#eceef7;--mute:#a3a8c0;--line:#ffffff1a;height:100dvh;display:grid;grid-template-columns:340px 1fr;background:#0c0e17;color:var(--ink);
  font:15px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.pb *{box-sizing:border-box}
.pb h1,.pb h2,.pb h3,.pb h4,.pb .cv h1{font-family:"Bricolage Grotesque",Inter,sans-serif}

/* Input panel */
.pb .panel{padding:28px 24px;overflow:auto;border-right:1px solid var(--line);background:#0e1019}
.pb .panel h1{font-size:24px;line-height:1.15;letter-spacing:-.02em;margin:0 0 8px}
.pb .sub{color:var(--mute);margin:0 0 24px;font-size:14px}
.pb label{display:block;margin:0 0 8px;font-size:13px;font-weight:500}
.pb textarea{width:100%;resize:vertical;padding:14px;border-radius:12px;border:1px solid #ffffff26;background:#ffffff08;color:var(--ink);font:inherit;font-size:14px;line-height:1.55}
.pb textarea:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 25%,transparent)}
.pb .meta{display:flex;justify-content:space-between;margin:8px 0 16px;font-size:12px;color:var(--mute)}
.pb .link{background:none;border:0;padding:0;color:var(--a);font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.pb .btn{width:100%;padding:13px;border-radius:12px;border:1px solid #ffffff2e;background:#ffffff0f;color:var(--ink);font:inherit;font-weight:600;cursor:pointer;display:inline-flex;gap:10px;align-items:center;justify-content:center;text-decoration:none;transition:transform .15s,background .15s,box-shadow .15s}
.pb .btn:hover:not(:disabled){transform:translateY(-1px);background:#ffffff1c}
.pb .btn.primary{background:linear-gradient(135deg,var(--a),var(--b));border:0;color:#0a0a12}
.pb .btn.primary:hover:not(:disabled){box-shadow:0 8px 30px -8px var(--a)}
.pb .btn:disabled{opacity:.6;cursor:not-allowed}
.pb .btn.sm{width:auto;padding:9px 16px;font-size:13px}
.pb .note{font-size:13px;color:var(--mute);margin:14px 0 0}
.pb button:focus-visible,.pb .sw:focus-within{outline:2px solid var(--a);outline-offset:2px}
.pb .spin{width:15px;height:15px;border:2px solid #0a0a1255;border-top-color:#0a0a12;border-radius:50%;animation:sp .7s linear infinite}
.pb .spin.dark{border-color:#ffffff40;border-top-color:#fff}
@keyframes sp{to{transform:rotate(360deg)}}

/* Stage + toolbar */
.pb .stage{display:flex;flex-direction:column;min-width:0;position:relative;overflow:hidden}
.pb .toolbar{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--line);background:#0c0e17e6;backdrop-filter:blur(12px);z-index:5}
.pb .seg{display:flex;background:#ffffff0f;border-radius:11px;padding:3px}
.pb .seg button{padding:7px 16px;border:0;border-radius:8px;background:none;color:var(--mute);font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:background .2s,color .2s}
.pb .seg .on{background:var(--a);color:#0a0a12;font-weight:600}
.pb .swatches{display:flex;gap:9px;align-items:center}
.pb .sw{width:24px;height:24px;border-radius:50%;border:2px solid transparent;padding:0;cursor:pointer;position:relative;transition:transform .15s}
.pb .sw:hover{transform:scale(1.15)}
.pb .sw.on{border-color:#fff;box-shadow:0 0 0 2px #0c0e17 inset}
.pb .sw.custom{background:conic-gradient(#ff5f6d,#ffc371,#47e891,#4cc2ff,#a78bfa,#ff5f6d);overflow:hidden}
.pb .sw input{position:absolute;inset:-6px;opacity:0;cursor:pointer;width:40px;height:40px}
.pb .dl{margin-left:auto;display:flex;align-items:center;gap:12px}
.pb .dl small{color:var(--mute);font-size:12px;max-width:190px;line-height:1.3}
.pb .hint{margin:0;padding:8px 20px;font-size:12px;color:var(--mute);background:#0c0e17}
.pb .preview{flex:1;overflow:auto;scroll-behavior:smooth;transition:filter .3s,opacity .3s}
.pb .preview.busy{filter:blur(4px);opacity:.35;pointer-events:none}
.pb .status{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:12px;align-items:center;padding:14px 22px;border-radius:14px;background:#161827;border:1px solid var(--line);font-weight:500;z-index:9}

/* Click-to-edit */
.pb .ed{outline:none;border-radius:4px;cursor:text;transition:background .15s,box-shadow .15s}
.pb .ed:hover{background:color-mix(in srgb,var(--a) 14%,transparent)}
.pb .ed:focus{background:color-mix(in srgb,var(--a) 18%,transparent);box-shadow:0 0 0 2px var(--a)}
.pb .ed:empty::before{content:attr(data-ph);opacity:.5}

/* View A */
.pb .port{position:relative;min-height:100%;padding:20px clamp(20px,5vw,72px) 80px;background:var(--bg);isolation:isolate}
.pb .port::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(520px circle at var(--px,70%) var(--py,12%),color-mix(in srgb,var(--a) 26%,transparent),transparent 70%),
             radial-gradient(700px 400px at 0% 55%,color-mix(in srgb,var(--b) 12%,transparent),transparent)}
.pb .glass{background:#ffffff0a;border:1px solid var(--line);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.pb .pnav{position:sticky;top:12px;z-index:4;display:flex;gap:2px;width:max-content;max-width:100%;overflow-x:auto;margin:0 auto;padding:5px;border-radius:999px}
.pb .pnav button{padding:7px 14px;border:0;border-radius:999px;background:none;color:var(--mute);font:inherit;font-size:13px;cursor:pointer;transition:background .2s,color .2s}
.pb .pnav button:hover{color:var(--ink)}
.pb .pnav .on{background:color-mix(in srgb,var(--a) 22%,transparent);color:var(--ink)}
.pb .hero{padding:clamp(56px,10vw,110px) 0 clamp(56px,9vw,100px);max-width:880px}
.pb .role{margin:0 0 14px;color:var(--a);font-weight:600;display:flex;align-items:center;gap:12px}
.pb .role::before{content:"";width:36px;height:2px;background:var(--a)}
.pb .hero h2{font-size:clamp(46px,9vw,112px);line-height:.95;letter-spacing:-.04em;font-weight:800;margin:0 0 28px}
.pb .hero p:last-child{font-size:clamp(17px,2vw,21px);line-height:1.6;color:var(--mute);max-width:56ch;margin:0}
.pb .port section{margin-bottom:80px;scroll-margin-top:70px}
.pb .port h3{font-size:clamp(24px,3.4vw,34px);letter-spacing:-.02em;margin:0 0 28px}
.pb .tl{list-style:none;margin:0;padding:0;display:grid;gap:22px;position:relative}
.pb .tl::before{content:"";position:absolute;left:160px;top:6px;bottom:6px;width:1px;background:var(--line)}
.pb .tl li{display:grid;grid-template-columns:150px 1fr;gap:20px}
.pb .when{text-align:right;padding-top:24px;color:var(--a);font-weight:600;font-size:14px;position:relative}
.pb .when::after{content:"";position:absolute;right:-14px;top:30px;width:9px;height:9px;border-radius:50%;background:var(--a);box-shadow:0 0 0 4px color-mix(in srgb,var(--a) 25%,transparent)}
.pb .card{padding:24px;border-radius:18px;transition:border-color .25s,transform .25s}
.pb .card:hover{border-color:var(--a);transform:translateY(-2px)}
.pb .card h4{margin:0 0 10px;font-size:19px;letter-spacing:-.01em}
.pb .card h4 em{font-style:normal;color:var(--mute);font-weight:500}
.pb .card ul{margin:0;padding-left:18px;color:var(--mute)}
.pb .card li{margin-bottom:6px}
.pb .card.big p{margin:0;color:var(--mute)}
.pb .card.big h4{font-size:22px}
.pb .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.pb .chips{display:flex;flex-wrap:wrap;gap:10px}
.pb .chip{padding:8px 18px;border-radius:999px;background:#ffffff0a;border:1px solid color-mix(in srgb,var(--a) 45%,transparent);font-weight:500;font-size:14px}
.pb .contact{text-align:left;padding:48px 0 0;border-top:1px solid var(--line);scroll-margin-top:70px}
.pb .contact p{color:var(--mute);margin:0 0 20px}
.pb .contact .btn{width:auto;padding:13px 28px}
.pb .rv{opacity:0}
.pb .rv.in{opacity:1;animation:rvIn .6s ease calc(var(--i,0)*90ms) backwards}
@keyframes rvIn{from{opacity:0;transform:translateY(16px)}}

/* Hover effects */
.pb .btn{position:relative;overflow:hidden}
.pb .btn:active:not(:disabled){transform:scale(.97)}
.pb .btn.primary::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,#ffffff80 50%,transparent 65%);transform:translateX(-130%);pointer-events:none}
.pb .btn.primary:hover:not(:disabled)::after{transform:translateX(130%);transition:transform .8s ease}
.pb .sw:hover{box-shadow:0 0 14px 2px #ffffff40}
.pb .seg button:hover:not(.on){color:var(--ink);background:#ffffff10}
.pb .pnav button:hover{background:#ffffff12;transform:translateY(-1px)}
.pb .role::before{transition:width .35s ease}
.pb .role:hover::before{width:72px}
.pb .hero h2{transition:text-shadow .4s}
.pb .hero h2:hover{text-shadow:0 0 50px color-mix(in srgb,var(--a) 55%,transparent)}

/* Cards: cursor spotlight, glow edge, 3D tilt on projects */
.pb .card{position:relative;overflow:hidden;transition:transform .2s ease-out,border-color .3s,box-shadow .3s}
.pb .card>*{position:relative}
.pb .card::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s;
  background:radial-gradient(320px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--a) 22%,transparent),transparent 65%)}
.pb .card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--a) 65%,transparent);box-shadow:0 20px 50px -22px var(--a)}
.pb .card:hover::before{opacity:1}
.pb .card[data-tilt]{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))}
.pb .card[data-tilt]:hover{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(-4px) scale(1.02)}

/* Skills: spotlight fill, shine sweep, magnetic pull, siblings dim */
.pb .chip{position:relative;overflow:hidden;transition:transform .2s ease-out,border-color .3s,box-shadow .3s,opacity .3s}
.pb .chip .ed{position:relative}
.pb .chip::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .3s;
  background:radial-gradient(70px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--a) 60%,transparent),transparent 75%)}
.pb .chip::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,#ffffff40 50%,transparent 65%);transform:translateX(-130%)}
.pb .chip:hover{transform:translate(var(--tx,0px),var(--ty,0px)) translateY(-5px) scale(1.08);border-color:var(--a);box-shadow:0 12px 30px -10px var(--a)}
.pb .chip:hover::before{opacity:1}
.pb .chip:hover::after{transform:translateX(130%);transition:transform .7s ease}
.pb .chips:hover .chip:not(:hover){opacity:.45;transform:scale(.96)}
@media (hover:none){.pb .chips:hover .chip:not(:hover){opacity:1;transform:none}}

/* Timeline dot pulses with its card */
.pb .when,.pb .when::after{transition:transform .3s,box-shadow .3s}
.pb .tl li:hover .when{transform:translateX(-4px)}
.pb .tl li:hover .when::after{transform:scale(1.6);box-shadow:0 0 0 6px color-mix(in srgb,var(--a) 25%,transparent),0 0 20px var(--a)}

/* CV rows highlight */
.pb .cv-job{margin:0 -10px 4px;padding:6px 10px;border-radius:8px;transition:background .25s,box-shadow .25s}
.pb .cv-job:hover{background:color-mix(in srgb,var(--a) 8%,transparent);box-shadow:inset 3px 0 0 var(--a)}

/* View B */
.pb .cv-wrap{padding:28px;background:#1a1d2a;min-height:100%}
.pb .cv{max-width:794px;margin:0 auto;background:#fff;color:#14151c;padding:52px 60px;font-size:14px;line-height:1.55;box-shadow:0 20px 60px #0008}
.pb .cv h1{font-size:34px;line-height:1.1;letter-spacing:-.02em;margin:0}
.pb .cv-role{margin:4px 0 2px;font-size:16px;color:#3b3e4d}
.pb .contact-line{margin:0 0 6px;color:#555;font-size:13px}
.pb .contact-line span+span::before{content:"|";margin:0 10px;color:#bbb}
.pb .contact-line span:empty{display:none}
.pb .cv h2{font-size:15px;margin:24px 0 8px;padding-left:10px;border-left:4px solid var(--a);line-height:1.2}
.pb .cv p{margin:0 0 8px}
.pb .cv ul{margin:4px 0 12px;padding-left:20px}
.pb .cv-row{display:flex;justify-content:space-between;gap:16px}

/* Light/dark mode, contrast tokens, contact, photo, hover typography */
.pb{--surf:#ffffff0a;--panel:#0e1019;--chrome:#0c0e17;--at:var(--a);--hi:color-mix(in srgb,var(--a) 30%,#fff);background:var(--chrome)}
.pb[data-mode="light"]{--ink:#14162a;--mute:#4b5068;--line:#14162a1f;--surf:#ffffffb8;--panel:#fff;--chrome:#f1f2f9;
  --at:color-mix(in srgb,var(--a) 50%,#0a0b18);--hi:color-mix(in srgb,var(--a) 58%,#000)}
.pb[data-mode="light"] .cv-wrap{background:#dfe2ee}
.pb[data-mode="light"] .spin.dark{border-color:#14162a33;border-top-color:#14162a}
.pb .panel{background:var(--panel)}
.pb textarea{background:var(--surf);border-color:color-mix(in srgb,var(--ink) 20%,transparent)}
.pb .btn{background:color-mix(in srgb,var(--ink) 7%,transparent);border-color:color-mix(in srgb,var(--ink) 18%,transparent)}
.pb .btn:hover:not(:disabled){background:color-mix(in srgb,var(--ink) 13%,transparent)}
.pb .btn.primary,.pb .btn.primary:hover:not(:disabled){background:linear-gradient(135deg,var(--a),var(--b));color:var(--on)}
.pb .btn.primary:hover:not(:disabled){filter:brightness(1.08)}
.pb .toolbar{background:color-mix(in srgb,var(--chrome) 90%,transparent)}
.pb .hint{background:var(--chrome)}
.pb .status{background:var(--panel)}
.pb .seg{background:color-mix(in srgb,var(--ink) 8%,transparent)}
.pb .seg .on{color:var(--on)}
.pb .seg button:hover:not(.on){background:color-mix(in srgb,var(--ink) 9%,transparent)}
.pb .glass,.pb .chip{background:var(--surf)}
.pb .pnav button:hover{background:color-mix(in srgb,var(--ink) 9%,transparent);color:var(--ink)}
.pb .sw:hover{box-shadow:0 0 14px 2px color-mix(in srgb,var(--a) 55%,transparent)}
.pb .role,.pb .when,.pb .link{color:var(--at)}
.pb .modebtn{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--surf);color:var(--ink);display:grid;place-items:center;cursor:pointer;transition:transform .4s,background .3s,color .3s}
.pb .modebtn:hover{transform:rotate(25deg);background:var(--a);color:var(--on)}
.pb .chk{display:flex;align-items:center;gap:6px;margin:0;font-size:13px;color:var(--mute);cursor:pointer}
.pb .chk input{accent-color:var(--a)}
.pb .chk:has(input:disabled){opacity:.5;cursor:not-allowed}

/* Hover typography: text brightens and picks up the accent */
.pb .card h4,.pb .card h4 em,.pb .card p,.pb .card li,.pb .lead,.pb .cpill .ed{transition:color .3s}
.pb .hero h2{transition:color .3s,text-shadow .4s}
.pb .card li::marker{color:var(--at)}
.pb .card:hover h4{color:var(--hi)}
.pb .card:hover h4 em,.pb .card:hover p,.pb .card:hover li{color:var(--ink)}
.pb .hero h2:hover{color:var(--hi)}
.pb .lead:hover{color:var(--ink)}
.pb .chip:hover{background:linear-gradient(135deg,var(--a),var(--b));color:var(--on);border-color:transparent}
.pb .chip::before{background:radial-gradient(80px circle at var(--mx,50%) var(--my,50%),#ffffff70,transparent 75%)}
.pb .cv-job strong{transition:color .25s}
.pb .cv-job:hover strong{color:color-mix(in srgb,var(--a) 62%,#000)}

/* Hero + photo */
.pb .hero{max-width:none;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:clamp(28px,5vw,72px);align-items:center}
.pb .hero-txt{max-width:760px}
.pb .hero p.lead{font-size:clamp(17px,2vw,21px);line-height:1.6;color:var(--mute);max-width:56ch;margin:0 0 28px}
.pb .avatar{position:relative;width:clamp(170px,24vw,300px);aspect-ratio:4/5;border-radius:30px;padding:3px;background:linear-gradient(135deg,var(--a),var(--b));box-shadow:0 30px 80px -34px var(--a);
  transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .2s ease-out,box-shadow .3s}
.pb .avatar:hover{box-shadow:0 40px 90px -30px var(--a)}
.pb .av-btn{display:block;width:100%;height:100%;padding:0;border:0;border-radius:27px;overflow:hidden;position:relative;cursor:pointer;background:var(--bg);font:inherit;color:inherit}
.pb .av-btn:focus-visible{outline:2px solid var(--at);outline-offset:4px}
.pb .av-btn img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s ease}
.pb .avatar:hover img{transform:scale(1.05)}
.pb .ph{position:absolute;inset:0;display:grid;place-content:center;gap:6px;text-align:center;background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--a) 22%,transparent),transparent 70%),var(--surf)}
.pb .ph b{font:800 clamp(48px,7vw,84px)/1 "Bricolage Grotesque",Inter,sans-serif;color:var(--at);letter-spacing:-.04em}
.pb .ph small{color:var(--mute);font-size:13px}
.pb .av-over{position:absolute;left:0;right:0;bottom:0;padding:14px;display:flex;gap:8px;justify-content:center;align-items:center;font-size:13px;font-weight:600;color:#fff;background:linear-gradient(transparent,#000b);transform:translateY(100%);transition:transform .3s}
.pb .av-btn:hover .av-over,.pb .av-btn:focus-visible .av-over{transform:none}
.pb .av-x{position:absolute;top:-8px;right:-8px;width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer;opacity:0;font-size:16px;line-height:1;transition:opacity .2s,transform .2s,background .2s}
.pb .avatar:hover .av-x,.pb .av-x:focus-visible{opacity:1}
.pb .av-x:hover{transform:scale(1.15);background:#e5484d;color:#fff}
@media (hover:none){.pb .av-over{transform:none}.pb .av-x{opacity:1}}

/* Social icons + contact pills */
.pb .socials{display:flex;gap:10px;flex-wrap:wrap}
.pb .soc{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:var(--ink);border:1px solid var(--line);background:var(--surf);transition:transform .3s,background .3s,color .3s,box-shadow .3s,border-color .3s}
.pb .soc:hover{transform:translateY(-4px) rotate(-6deg);background:linear-gradient(135deg,var(--a),var(--b));color:var(--on);border-color:transparent;box-shadow:0 12px 28px -10px var(--a)}
.pb .soc:focus-visible,.pb .cico:focus-visible{outline:2px solid var(--a);outline-offset:3px}
.pb .cpills{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 28px}
.pb .cpill{display:flex;align-items:center;gap:12px;padding:8px 20px 8px 8px;border-radius:999px;transition:border-color .3s,transform .25s,box-shadow .3s}
.pb .cpill .ed{color:var(--ink)}
.pb .cico{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;flex:none;color:var(--at);background:color-mix(in srgb,var(--a) 16%,transparent);transition:background .3s,color .3s,transform .35s}
.pb .cpill:hover{transform:translateY(-3px);border-color:var(--a);box-shadow:0 12px 30px -14px var(--a)}
.pb .cpill:hover .cico{background:var(--a);color:var(--on);transform:rotate(-8deg) scale(1.08)}
.pb .cpill:hover .ed{color:var(--hi)}
.pb .cpill.empty{border-style:dashed;background:transparent}
.pb .cpill.empty .ed{color:var(--mute)}
.pb .cpill.empty .cico{background:none;border:1px dashed var(--line);color:var(--mute)}

/* CV contact + photo */
.pb .cv-photo{float:right;width:96px;height:96px;border-radius:50%;object-fit:cover;margin:0 0 8px 16px}
.pb .contact-line span+span::before{content:none}
.pb .contact-line .sep{color:#aaa;white-space:pre}
/* Animated background */
.pb .port{overflow:clip}
.pb .bg{position:sticky;top:0;height:0;margin:-20px calc(-1*clamp(20px,5vw,72px)) 0;z-index:-1;pointer-events:none}
.pb .bg canvas{position:absolute;left:0;top:0}
.pb .aurora{position:absolute;left:0;top:0;width:100%;height:100dvh;overflow:hidden}
.pb .aurora i{position:absolute;width:55vmax;height:55vmax;border-radius:50%;opacity:.5;
  background:radial-gradient(circle,color-mix(in srgb,var(--a) 38%,transparent),transparent 65%);animation:drift 22s ease-in-out infinite alternate}
.pb .aurora i:nth-child(1){left:-15%;top:-25%}
.pb .aurora i:nth-child(2){right:-20%;top:10%;background:radial-gradient(circle,color-mix(in srgb,var(--b) 32%,transparent),transparent 65%);animation-duration:28s;animation-delay:-8s}
.pb .aurora i:nth-child(3){left:20%;bottom:-40%;opacity:.35;animation-duration:34s;animation-delay:-15s}
.pb[data-mode="light"] .aurora i{opacity:.26}
.pb .aurora::before{content:"";position:absolute;left:-20%;top:-40%;width:140%;height:180%;background:conic-gradient(from 0deg at 65% 35%,transparent 0 55%,color-mix(in srgb,var(--a) 14%,transparent) 70%,transparent 85%);animation:sweep 50s linear infinite}
.pb .aurora::after{content:"";position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
@keyframes sweep{to{transform:rotate(360deg)}}
@keyframes drift{to{transform:translate(12vmax,8vmax) scale(1.25) rotate(40deg)}}
@media (prefers-reduced-motion:reduce){.pb .aurora i,.pb .aurora::before{animation:none!important}}

/* Modern CV */
.pb .cv.modern{display:grid;grid-template-columns:250px 1fr;grid-template-areas:"side main";min-height:1123px;padding:0;font-size:13.5px;overflow:hidden}
.pb .cv-main{grid-area:main;padding:46px 44px 40px;position:relative}
.pb .cv-main::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:linear-gradient(90deg,var(--a),var(--b))}
.pb .cv.modern h1{font-size:40px;line-height:1.02;letter-spacing:-.03em;margin:0}
.pb .cv.modern .cv-role{font-size:17px;font-weight:600;margin:8px 0 22px;color:color-mix(in srgb,var(--a) 62%,#111)}
.pb .cv.modern h2{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700;margin:26px 0 12px;padding:0;border:0;color:#14151c}
.pb .cv.modern h2::before{content:"";width:8px;height:8px;border-radius:2px;background:var(--a)}
.pb .cv.modern h2::after{content:"";flex:1;height:1px;background:#e3e5ee}
.pb .mx-job{position:relative;margin:0 0 14px;padding:0 0 14px;border-bottom:1px solid #eceef5}
.pb .mx-job:last-child{border-bottom:0;margin-bottom:0;padding-bottom:0}
.pb .mx-job ul{list-style:none;margin:6px 0 0;padding:0}
.pb .mx-job li{position:relative;margin:0 0 4px;padding-left:16px}
.pb .mx-job li::before{content:"";position:absolute;left:0;top:.7em;width:7px;height:2px;border-radius:2px;background:var(--a)}
.pb .mx-job strong{font-size:14.5px;transition:color .25s}
.pb .mx-job:hover strong{color:color-mix(in srgb,var(--a) 62%,#000)}
.pb .per{align-self:flex-start;padding:2px 10px;border-radius:999px;font-size:11.5px;font-weight:600;white-space:nowrap;background:color-mix(in srgb,var(--a) 13%,#fff);color:color-mix(in srgb,var(--a) 58%,#1a1a2a)}
.pb .mx-co{margin:0 0 4px;font-weight:600;font-size:13px;color:color-mix(in srgb,var(--a) 60%,#111)}
.pb .cv-side{grid-area:side;position:relative;overflow:hidden;padding:46px 26px;color:#e9ebf7;background:color-mix(in srgb,var(--a) 14%,#0f1226)}
.pb .cv-side::before{content:"";position:absolute;width:280px;height:280px;border-radius:50%;left:-120px;top:-120px;background:radial-gradient(circle,color-mix(in srgb,var(--a) 45%,transparent),transparent 70%)}
.pb .cv-side>*{position:relative}
.pb .mx-photo{display:block;width:140px;height:140px;margin:0 auto 26px;border-radius:50%;object-fit:cover;border:3px solid var(--a);box-shadow:0 0 0 6px color-mix(in srgb,var(--a) 22%,transparent)}
.pb .cv-side h3{margin:26px 0 12px;font:700 14px "Bricolage Grotesque",Inter,sans-serif;color:color-mix(in srgb,var(--a) 45%,#fff)}
.pb .mx-contact{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.pb .mx-contact li{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;word-break:break-word}
.pb .mx-contact svg{flex:none;margin-top:2px;color:color-mix(in srgb,var(--a) 55%,#fff)}
.pb .mx-empty{font-size:12px;color:#aab0cc}
.pb .cv-side .ed:hover,.pb .cv-side .ed:focus{background:#ffffff1f}
/* Skills */
.pb .mx-skills{display:flex;flex-wrap:wrap;gap:8px}
.pb .mx-skill{display:inline-flex;align-items:center;padding:5px 12px;border-radius:999px;font-size:12.5px;line-height:1.3;background:#ffffff12;border:1px solid #ffffff24;transition:background .25s,color .25s,transform .25s,border-color .25s}
.pb .mx-skill::before{content:"";flex:none;width:6px;height:6px;margin-right:8px;border-radius:50%;background:var(--a);transition:background .25s}
.pb .mx-skill:hover{background:linear-gradient(135deg,var(--a),var(--b));color:var(--on);border-color:transparent;transform:translateY(-2px)}
.pb .mx-skill:hover::before{background:var(--on)}
.pb .mx-skill .ed:hover,.pb .mx-skill .ed:focus{background:transparent}
.pb .sk-x{width:0;opacity:0;overflow:hidden;padding:0;margin:0;border:0;background:none;color:inherit;font:inherit;line-height:1;cursor:pointer;transition:width .2s,opacity .2s,margin .2s,transform .2s}
.pb .mx-skill:hover .sk-x,.pb .chip:hover .sk-x,.pb .sk-x:focus-visible{width:14px;opacity:.85;margin-left:6px}
.pb .sk-x:hover{opacity:1;transform:scale(1.25)}
.pb .sk-add{padding:5px 12px;border-radius:999px;border:1px dashed #ffffff44;background:none;color:#c9cde3;font:inherit;font-size:12.5px;cursor:pointer;transition:background .25s,color .25s,border-color .25s}
.pb .sk-add:hover{background:#ffffff1a;color:#fff;border-color:var(--a)}
.pb .sk-add.ats{padding:0 8px;margin-left:8px;border-radius:6px;border:1px solid #d5d8e3;color:#6b6f82;font-size:12px}
.pb .sk-add.ats:hover{background:#f1f2f7;color:#14151c}
.pb .chip.sk-add{border:1px dashed color-mix(in srgb,var(--a) 50%,transparent);background:transparent;color:var(--mute);padding:8px 18px;font-size:14px;font-weight:500}
/* CV contact bar: horizontal icons, details on click */
.pb .cv.modern .cv-role{margin:8px 0 16px}
.pb .cbar{margin:0 0 4px}
.pb .cicons{display:flex;flex-wrap:wrap;gap:8px}
.pb .cib{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;border:1px solid #e3e5ee;background:#fff;color:#4b4f63;cursor:pointer;transition:transform .2s,background .25s,color .25s,border-color .25s,box-shadow .25s}
.pb .cib:hover{transform:translateY(-2px);border-color:var(--a);color:color-mix(in srgb,var(--a) 62%,#000)}
.pb .cib.on{background:linear-gradient(135deg,var(--a),var(--b));border-color:transparent;color:var(--on);box-shadow:0 8px 18px -8px var(--a)}
.pb .cib.empty:not(.on){border-style:dashed;color:#9aa0b5}
.pb .cib:focus-visible{outline:2px solid var(--a);outline-offset:2px}
.pb .cdetail{display:flex;align-items:center;gap:10px;min-height:36px;margin-top:10px;padding:6px 12px;border-radius:10px;background:#f4f5fa;font-size:13px;animation:rvIn .3s ease backwards}
.pb .cd-l{font-weight:700;color:color-mix(in srgb,var(--a) 62%,#111)}
.pb .cd-hint{color:#7a7f94;font-size:12.5px}
.pb .cd-go{margin-left:auto;font-size:12px;font-weight:600;text-decoration:none;color:color-mix(in srgb,var(--a) 62%,#111)}
.pb .cd-go:hover{text-decoration:underline}
.pb .cprint{display:none}
@media print{
  .pb .cprint{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0 0 4px;padding:0;list-style:none;font-size:12px;color:#3b3e4d}
  .pb .cprint li{display:inline-flex;align-items:center;gap:6px}
  .pb .cprint a{color:inherit;text-decoration:none}
  .pb .cprint svg{color:color-mix(in srgb,var(--a) 62%,#111)}
}

/* Portfolio UX: progress, entrance, CTAs, back-to-top */
.pb .prog{position:absolute;left:0;top:0;width:100%;height:3px;transform:scaleX(0);transform-origin:0 50%;background:linear-gradient(90deg,var(--a),var(--b));transition:transform .1s linear}
.pb .hero-txt>*{animation:rvIn .8s cubic-bezier(.2,.7,.2,1) backwards}
.pb .hero-txt>:nth-child(2){animation-delay:.08s}.pb .hero-txt>:nth-child(3){animation-delay:.16s}
.pb .hero-txt>:nth-child(4){animation-delay:.24s}.pb .hero-txt>:nth-child(5){animation-delay:.32s}
.pb .avatar{animation:rvIn .9s cubic-bezier(.2,.7,.2,1) .2s backwards}
.pb .socials{margin-bottom:28px}
.pb .cta{display:flex;flex-wrap:wrap;gap:12px}
.pb .cta .btn{width:auto;padding:13px 26px}
.pb .card p{margin:0;color:var(--mute)}
.pb .copy{margin:56px 0 0;text-align:center;font-size:13px;color:var(--mute)}
.pb .totop-wrap{position:sticky;bottom:0;height:0;z-index:6}
.pb .totop{position:absolute;right:0;bottom:24px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:var(--ink);cursor:pointer;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .3s,transform .3s,background .3s,color .3s}
.pb .totop.show{opacity:1;transform:none;pointer-events:auto}
.pb .totop:hover{background:var(--a);color:var(--on);border-color:transparent}

/* CV extras: contact icons, education */
.pb .mx-contact li{align-items:center}
.pb .mx-contact li.empty{opacity:.5}
.pb .mx-ico{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:8px;color:color-mix(in srgb,var(--a) 55%,#fff);background:#ffffff12;transition:background .25s,color .25s}
.pb .mx-ico svg{margin:0;color:inherit}
.pb .mx-contact li:hover .mx-ico{background:var(--a);color:var(--on)}
.pb .edu{position:relative;margin:0 0 10px}
.pb .edu-d{margin:0;color:#4b4f63}
.pb .ed-x{position:absolute;right:-22px;top:0;width:18px;height:18px;border:0;border-radius:50%;background:#eceef5;color:#555;cursor:pointer;opacity:0;line-height:1;transition:opacity .2s}
.pb .edu:hover .ed-x{opacity:1}
.pb .contact-line .cl{display:inline-flex;align-items:center;gap:5px}
.pb .contact-line .cl svg{color:#777;flex:none}
@media print{
  .pb .mx-contact li:has(.ed:empty){display:none}
  .pb .mx-skill:has(.ed:empty){display:none}
  .pb .cv.ats{padding:14mm 16mm}
  .pb .cv.modern{min-height:297mm}
}
@media screen and (max-width:860px){
  .pb .cv.modern{grid-template-columns:1fr;grid-template-areas:"side" "main";min-height:0}
}

@media screen and (max-width:860px){
  .pb .hero{grid-template-columns:1fr}
  .pb .avatar{order:-1;width:150px}
  .pb .cpill{width:100%}
}

@media screen and (max-width:860px){
  .pb{grid-template-columns:1fr;height:auto;min-height:100dvh}
  .pb .stage{overflow:visible}
  .pb .toolbar{position:sticky;top:0}
  .pb .preview{overflow:visible}
  .pb .panel{border:0}
  .pb .dl{margin-left:0}
  .pb .tl::before,.pb .when::after{display:none}
  .pb .tl li{grid-template-columns:1fr;gap:6px}
  .pb .when{text-align:left;padding-top:0}
  .pb .cv{padding:28px 22px}
  .pb .cv-row{flex-direction:column;gap:0}
  .pb .status{position:fixed}
}
@media (prefers-reduced-motion:reduce){
  .pb *{transition:none!important;animation-duration:.01s!important}
  .pb .preview{scroll-behavior:auto}
  .pb .rv{opacity:1;transform:none}
}

/* Print: CV only, A4, no UI */
@page{size:A4;margin:0}
@media print{
  body *{visibility:hidden}
  .pb .cv,.pb .cv *{visibility:visible}
  .pb .no-print{display:none!important}
  .pb,.pb .stage,.pb .preview{display:block!important;height:auto!important;overflow:visible!important}
  .pb .cv-wrap{padding:0;background:#fff}
  .pb .cv{position:absolute;left:0;top:0;width:100%;max-width:none;margin:0;padding:0;box-shadow:none}
  .pb .ed:empty{display:none}
  .pb .cv h2,.pb .cv-job{break-inside:avoid}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;