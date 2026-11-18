import nextEnv from "@next/env";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd());
if (!/^libsql:\/\//i.test(process.env.TURSO_DATABASE_URL || "") || !process.env.TURSO_AUTH_TOKEN) throw new Error("Remote Turso settings are required.");
if (process.env.SALARY_TEST_DATABASE_CONFIRMED !== "1") throw new Error("This test creates and deletes records. Set SALARY_TEST_DATABASE_CONFIRMED=1 only after verifying that both server and script use the same dedicated non-production Turso database.");
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const origin = "http://localhost:3000", created = [];
async function post(path, body, cookie = "") {
  return fetch(origin + path, { method: "POST", headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
}
async function createTestUser() {
  const email = `salary-turso-test-${randomUUID()}@example.com`, password = `Test-${randomUUID()}`;
  const signup = await post("/api/auth/sign-up/email", { email, password, name: "Salary temporary test" });
  const data = await signup.json();
  if (!signup.ok || !data.user?.id) throw new Error(`Test registration failed (HTTP ${signup.status}).`);
  created.push({ id: data.user.id, email });
  const login = await post("/api/auth/sign-in/email", { email, password });
  if (!login.ok) throw new Error(`Test login failed (HTTP ${login.status}).`);
  return login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}
try {
  const userCookie = await createTestUser(), otherCookie = await createTestUser();
  const cats = await db.execute({ sql: "SELECT id FROM categories WHERE user_id=? AND type='expense'", args: [created[0].id] });
  if (cats.rows.length !== 4) throw new Error("Default expense categories missing.");
  const categoryId = String(cats.rows[0].id);
  const add = await post("/api/transactions", { operation: "create", type: "expense", categoryId, amount: "25.50", date: "2026-01-05", comment: "temporary smoke test" }, userCookie);
  if (!add.ok) throw new Error(`Test operation failed (HTTP ${add.status}).`);
  const data = await db.execute({ sql: "SELECT id,amount_minor FROM transactions WHERE user_id=?", args: [created[0].id] });
  if (data.rows.length !== 1 || Number(data.rows[0].amount_minor) !== 2550) throw new Error("Test operation was not saved correctly.");
  const otherUpdate = await post("/api/transactions", { operation: "delete", id: String(data.rows[0].id) }, otherCookie);
  if (otherUpdate.status !== 404) throw new Error("Cross-account isolation check failed.");
  const report = await fetch(`${origin}/dashboard?from=2026-01-01&to=2026-01-31`, { headers: { cookie: userCookie } });
  if (!report.ok || !(await report.text()).includes("25,50")) throw new Error("Dashboard did not show the test operation.");
  console.log("Turso app smoke test passed: signup, login, categories, operation, isolation and report.");
} finally {
  let cleanupFailed = false;
  for (const user of created) {
    try {
      for (const table of ["transactions", "session", "account", "categories", "profiles", "currency_locks"]) await db.execute({ sql: `DELETE FROM ${table} WHERE user_id=?`, args: [user.id] });
      await db.execute({ sql: "DELETE FROM user WHERE id=? AND email=?", args: [user.id, user.email] });
    } catch { cleanupFailed = true; }
  }
  db.close();
  if (cleanupFailed) { console.error("Could not remove temporary test records; inspect accounts named Salary temporary test."); process.exitCode = 1; }
}
