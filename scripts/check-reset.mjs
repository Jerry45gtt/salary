import "./local-test-only.mjs";
import { createClient } from "@libsql/client";
import { createHash, randomUUID, randomBytes } from "node:crypto";
const db = createClient({ url: "file:local.db" }), origin = "http://localhost:3000";
const email = `reset-test-${randomUUID()}@example.com`, oldPassword = `Old-${randomUUID()}`, newPassword = `New-${randomUUID()}`;
let id;
async function post(path, body, cookie = "") { return fetch(origin + path, { method: "POST", headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }); }
try {
  const signup = await post("/api/auth/sign-up/email", { name: "Reset test", email, password: oldPassword });
  const user = await signup.json(); if (!signup.ok || !user.user?.id) throw Error("Signup failed"); id = user.user.id;
  const login = await post("/api/auth/sign-in/email", { email, password: oldPassword }); if (!login.ok) throw Error("Login failed");
  const cookie = login.headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  const token = randomBytes(24).toString("base64url"), identifier = createHash("sha256").update(`reset-password:${token}`).digest("base64url"), now = Date.now();
  // Simulate the token normally created when a reset email is requested, without sending email.
  await db.execute({ sql: "INSERT INTO verification(id,identifier,value,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?)", args: [randomUUID(), identifier, id, now + 60000, now, now] });
  const reset = await post("/api/auth/reset-password", { token, newPassword }); if (!reset.ok) throw Error(`Password reset failed: ${reset.status}`);
  const reuse = await post("/api/auth/reset-password", { token, newPassword }); if (reuse.ok) throw Error("Reset token accepted twice");
  const dashboard = await fetch(`${origin}/dashboard`, { headers: { cookie }, redirect: "manual" }); if (dashboard.status !== 307) throw Error("Old session was not revoked");
  if ((await post("/api/auth/sign-in/email", { email, password: oldPassword })).ok) throw Error("Old password still works");
  if (!(await post("/api/auth/sign-in/email", { email, password: newPassword })).ok) throw Error("New password does not work");
  console.log("Password reset, single-use token, session revocation and new login passed; email delivery was not tested.");
} finally {
  if (id) { for (const table of ["session", "account", "categories", "profiles", "currency_locks"]) await db.execute({ sql: `DELETE FROM ${table} WHERE user_id=?`, args: [id] }); await db.execute({ sql: "DELETE FROM verification WHERE value=?", args: [id] }); await db.execute({ sql: "DELETE FROM user WHERE id=?", args: [id] }); }
  db.close();
}
