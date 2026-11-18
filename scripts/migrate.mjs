import { createClient } from "@libsql/client";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.TURSO_DATABASE_URL || "file:local.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) throw new Error("Set TURSO_AUTH_TOKEN for a remote database.");
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
try {
  for (const file of ["001_initial.sql", "002_currency_lock.sql", "003_rate_limit.sql"]) {
    const sql = await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8");
    await client.executeMultiple(sql);
  }
  console.log("Database schema is ready.");
} finally { client.close(); }
