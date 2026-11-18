import "./local-test-only.mjs";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
const db = createClient({ url: "file:local.db" });
const origin = "http://localhost:3000", email = `report-test-${randomUUID()}@example.com`, password = `Pass-${randomUUID()}`;
let id;
async function post(path, body) { return fetch(origin + path, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }); }
try {
  const signup = await post("/api/auth/sign-up/email", { name: "Report test", email, password });
  const user = await signup.json(); if (!signup.ok || !user.user?.id) throw Error("Signup failed"); id = user.user.id;
  const login = await post("/api/auth/sign-in/email", { email, password }); if (!login.ok) throw Error("Login failed");
  const cookie = login.headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  const cats = await db.execute({ sql: "SELECT id,type FROM categories WHERE user_id=? ORDER BY name", args: [id] });
  const income = String(cats.rows.find((r) => r.type === "income").id);
  const expenses = cats.rows.filter((r) => r.type === "expense").slice(0, 2).map((r) => String(r.id));
  const now = new Date().toISOString();
  for (const [category, type, amount, date] of [[income, "income", 100000, "2026-01-01"], [expenses[0], "expense", 30000, "2026-02-01"], [expenses[1], "expense", 20000, "2026-03-03"], [income, "income", 999900, "2026-03-04"]]) {
    await db.execute({ sql: "INSERT INTO transactions(id,user_id,category_id,type,amount_minor,date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", args: [randomUUID(), id, category, type, amount, date, now, now] });
  }
  await db.execute({ sql: "UPDATE categories SET archived_at=? WHERE id=? AND user_id=?", args: [now, expenses[0], id] });
  const load = async (from, to) => { const response = await fetch(`${origin}/dashboard?from=${from}&to=${to}`, { headers: { cookie } }); if (!response.ok) throw Error(`Dashboard failed: ${response.status}`); return (await response.text()).replace(/\s/g, " "); };
  const daily = await load("2026-01-01", "2026-03-03");
  if (!daily.includes("По дням") || !daily.includes("60%") || !daily.includes("40%") || !daily.includes("(архив)") || !daily.includes("1 000,00") || !daily.includes("500,00") || daily.includes("9 999,00")) throw Error("Totals, category shares or inclusive boundaries failed");
  const monthly = await load("2026-01-01", "2026-03-04");
  if (!monthly.includes("По месяцам") || !monthly.includes("2026-03")) throw Error("Monthly grouping failed");
  const empty = await load("2025-01-01", "2025-01-02");
  if (!empty.includes("За этот период операций нет") || !empty.includes("За этот период расходов нет")) throw Error("Empty state failed");
  console.log("Totals, date boundaries, archived categories, shares, grouping and empty periods passed.");
} finally {
  if (id) { for (const table of ["transactions", "session", "account", "categories", "profiles", "currency_locks"]) await db.execute({ sql: `DELETE FROM ${table} WHERE user_id=?`, args: [id] }); await db.execute({ sql: "DELETE FROM user WHERE id=?", args: [id] }); }
  db.close();
}
