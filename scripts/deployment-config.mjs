// Pure, offline validation. Return fixed messages only: never echo env values.
export function deploymentConfigErrors(env) {
  const errors = [];
  const url = (name, protocols, originOnly = false) => {
    try {
      const value = env[name];
      if (!value || /your-project|your-password|example\.com/.test(value)) throw new Error();
      const parsed = new URL(value);
      if (!protocols.includes(parsed.protocol) || !parsed.hostname) throw new Error();
      if (originOnly && (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash)) throw new Error();
    } catch { errors.push(`${name}: set a valid ${originOnly ? "HTTPS origin without a path or credentials" : "PostgreSQL connection URL"}; placeholders are not accepted.`); }
  };
  url("APP_ORIGIN", ["https:"], true);
  url("NEXT_PUBLIC_SUPABASE_URL", ["https:"], true);
  url("DATABASE_URL", ["postgres:", "postgresql:"]);
  url("DIRECT_URL", ["postgres:", "postgresql:"]);
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  let anonJwt = false;
  try { anonJwt = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString()).role === "anon"; } catch { /* Not a legacy key. */ }
  if ((!key.startsWith("sb_publishable_") && !anonJwt) || /your-project|placeholder/i.test(key)) errors.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: use a publishable or legacy anon key, never a secret/service-role key.");
  for (const name of Object.keys(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && /SERVICE_ROLE|SECRET|PASSWORD|DATABASE_URL|DIRECT_URL|LLM.*KEY|OPENAI.*KEY|ANTHROPIC.*KEY/i.test(name) && env[name]) {
      errors.push("A secret-bearing NEXT_PUBLIC variable is configured; remove it from public environment settings.");
      break;
    }
  }
  return errors;
}
