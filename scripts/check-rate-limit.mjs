import "./local-test-only.mjs";
import { createClient } from "@libsql/client";
import { randomInt, randomUUID } from "node:crypto";
const db = createClient({ url: "file:local.db" }), origin = "http://localhost:3000";
const ip = `198.18.${randomInt(1, 255)}.${randomInt(1, 255)}`, key = `${ip}|/sign-in/email`;
try {
  const statuses = [];
  for (let i = 0; i < 4; i++) {
    const response = await fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ email: `rate-test-${randomUUID()}@example.com`, password: "invalid-password" }) });
    statuses.push(response.status);
  }
  const result = await db.execute({ sql: "SELECT count FROM rate_limit WHERE key=?", args: [key] });
  if (statuses.slice(0, 3).some((s) => s !== 401) || statuses[3] !== 429 || Number(result.rows[0]?.count) !== 3) throw Error(`Rate limit failed: ${statuses.join(",")}`);
  const simultaneous = await Promise.all(Array.from({ length: 5 }, () => fetch(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ email: `rate-test-${randomUUID()}@example.com`, password: "invalid-password" }) })));
  if (simultaneous.some((response) => response.status !== 429)) throw Error("Concurrent requests exceeded the rate limit");
  console.log("Database-backed rate limit returns 429, stores the counter and rejects concurrent requests after the limit.");
} finally {
  await db.execute({ sql: "DELETE FROM rate_limit WHERE key=?", args: [key] });
  db.close();
}
