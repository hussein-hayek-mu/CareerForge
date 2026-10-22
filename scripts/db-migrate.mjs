import nextEnv from "@next/env";
import { Client } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd());
const client = new Client({ connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL, connectionTimeoutMillis: 15000, statement_timeout: 30000 });
try {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) throw new Error("MISSING_DATABASE_URL");
  await client.connect();
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(728401321)");
  await client.query("create schema if not exists careerforge_internal");
  await client.query("revoke all on schema careerforge_internal from public, anon, authenticated");
  await client.query("create table if not exists careerforge_internal.migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())");
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
    const sql = (await readFile(new URL(name, directory), "utf8")).replace(/\r\n/g, "\n");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query("select checksum from careerforge_internal.migrations where name=$1", [name]);
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) throw new Error("MIGRATION_CHECKSUM_MISMATCH");
      console.log("Already applied:", name);
      continue;
    }
    await client.query(sql);
    await client.query("insert into careerforge_internal.migrations (name, checksum) values ($1, $2)", [name, checksum]);
    console.log("Applied:", name);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("Migration failed; transaction rolled back:", error.code ?? (error.message === "MIGRATION_CHECKSUM_MISMATCH" ? error.message : "check connection and schema"));
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }
