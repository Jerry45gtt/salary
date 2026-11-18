import "./local-test-only.mjs";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

// Local development smoke test; it removes only the account created by this run.
const client = createClient({ url: "file:local.db" });
const origin = "http://localhost:3000";
const email = `salary-test-${randomUUID()}@example.com`;
const password = `Pass-${randomUUID()}`;
let id;
async function post(path, body, cookie) {
  return fetch(`${origin}/api/auth/${path}`, { method: "POST", headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
}
try {
  const signup = await post("sign-up/email", { name: "Test", email, password });
  const created = await signup.json();
  if (!signup.ok || !created.user?.id) throw new Error("Registration failed");
  id = created.user.id;
  const categories = await client.execute({ sql: "SELECT count(*) AS total FROM categories WHERE user_id = ?", args: [id] });
  if (Number(categories.rows[0].total) !== 6) throw new Error("Default categories are missing");
  const login = await post("sign-in/email", { email, password });
  if (!login.ok) throw new Error("Login failed");
  const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const dashboard = await fetch(`${origin}/dashboard`, { headers: { cookie }, redirect: "manual" });
  if (dashboard.status !== 200 || !(await dashboard.text()).includes(email)) throw new Error("Authenticated dashboard failed");
  const logout = await post("sign-out", {}, cookie);
  if (!logout.ok) throw new Error("Logout failed");
  const after = await fetch(`${origin}/dashboard`, { headers: { cookie }, redirect: "manual" });
  if (after.status !== 307) throw new Error("Session remained active after logout");
  console.log("Registration, default categories, login, protected dashboard and logout passed.");
} finally {
  if (id) {
    for (const table of ["session", "account", "categories", "profiles"]) await client.execute({ sql: `DELETE FROM ${table} WHERE user_id = ?`, args: [id] });
    await client.execute({ sql: "DELETE FROM user WHERE id = ?", args: [id] });
  }
  client.close();
}
