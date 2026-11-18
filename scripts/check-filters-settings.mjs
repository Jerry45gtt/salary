import "./local-test-only.mjs";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
const db = createClient({ url: "file:local.db" });
const origin = "http://localhost:3000", email = `filter-test-${randomUUID()}@example.com`, password = `Pass-${randomUUID()}`;
let id;
async function post(path, body, cookie = "") { return fetch(origin + path, { method: "POST", headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }); }
try {
  const signup = await post("/api/auth/sign-up/email", { name: "Test", email, password });
  const user = await signup.json(); if (!signup.ok || !user.user?.id) throw Error("Signup failed"); id = user.user.id;
  const login = await post("/api/auth/sign-in/email", { email, password });
  if (!login.ok) throw Error("Login failed");
  const cookie = login.headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  if (!(await post("/api/settings", { currency: "USD" }, cookie)).ok) throw Error("Currency change failed");
  const cat = await db.execute({ sql: "SELECT id FROM categories WHERE user_id=? AND type='expense' LIMIT 1", args: [id] });
  const category = String(cat.rows[0].id), now = new Date().toISOString();
  for (let i = 0; i < 51; i++) await db.execute({ sql: "INSERT INTO transactions(id,user_id,category_id,type,amount_minor,date,comment,created_at,updated_at) VALUES(?,?,?,'expense',100,?,?,?,?)", args: [randomUUID(), id, category, i === 50 ? "2026-01-01" : "2026-02-01", `FilterCheck${i}`, now, now] });
  const response = await fetch(`${origin}/transactions?from=2026-01-01&to=2026-02-01&type=expense`, { headers: { cookie } });
  const html = await response.text();
  if (!response.ok || !html.includes("Следующие 50") || !html.includes("USD") || html.includes("FilterCheck50")) throw Error("First filtered page failed");
  const match = html.match(/href="([^\"]*cursorDate=[^\"]+)"/);
  if (!match) throw Error("Cursor missing");
  const nextPath = match[1].replaceAll("&amp;", "&");
  const page2 = await fetch(origin + nextPath, { headers: { cookie } });
  if (!page2.ok || !(await page2.text()).includes("FilterCheck50")) throw Error("Second page failed");
  const filtered = await fetch(`${origin}/transactions?from=2026-02-02`, { headers: { cookie } });
  if (!(await filtered.text()).includes("По выбранным фильтрам операций нет")) throw Error("Empty filtered state failed");
  const blocked = await post("/api/settings", { currency: "EUR" }, cookie);
  if (blocked.status !== 409) throw Error("Currency lock failed");
  await db.execute({ sql: "DELETE FROM transactions WHERE user_id=?", args: [id] });
  if ((await post("/api/settings", { currency: "EUR" }, cookie)).status !== 409) throw Error("Currency unlocked after deletion");
  console.log("Currency locking, filters and cursor pagination passed.");
} finally {
  if (id) {
    for (const table of ["transactions", "session", "account", "categories", "profiles", "currency_locks"]) await db.execute({ sql: `DELETE FROM ${table} WHERE user_id=?`, args: [id] });
    await db.execute({ sql: "DELETE FROM user WHERE id=?", args: [id] });
  }
  db.close();
}
