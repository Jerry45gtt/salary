import "./local-test-only.mjs";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const db = createClient({ url: "file:local.db" });
const origin = "http://localhost:3000";
const users = [];
async function post(path, body, cookie = "") {
  return fetch(origin + path, { method: "POST", headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
}
async function createUser() {
  const email = `category-test-${randomUUID()}@example.com`, password = `Pass-${randomUUID()}`;
  const signup = await post("/api/auth/sign-up/email", { name: "Test", email, password });
  const data = await signup.json();
  if (!signup.ok || !data.user?.id) throw Error("Signup failed");
  users.push(data.user.id);
  const login = await post("/api/auth/sign-in/email", { email, password });
  if (!login.ok) throw Error("Login failed");
  return login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}
try {
  const owner = await createUser(), other = await createUser();
  const create = await post("/api/categories", { operation: "create", type: "expense", name: "Тестовая" }, owner);
  if (!create.ok) throw Error("Create failed");
  const result = await db.execute({ sql: "SELECT id FROM categories WHERE user_id=? AND name=?", args: [users[0], "Тестовая"] });
  const id = result.rows[0]?.id;
  if (!id) throw Error("Created category missing");
  const duplicate = await post("/api/categories", { operation: "create", type: "expense", name: "тЕСТОВАЯ" }, owner);
  if (duplicate.status !== 409) throw Error(`Duplicate check failed: ${duplicate.status}`);
  const forbidden = await post("/api/categories", { operation: "rename", id, name: "Чужая" }, other);
  if (forbidden.status !== 404) throw Error("Cross-user update was not rejected");
  const rename = await post("/api/categories", { operation: "rename", id, name: "Обновлённая" }, owner);
  if (!rename.ok) throw Error("Rename failed");
  const tx = { operation: "create", categoryId: id, type: "expense", amount: "123,45", date: "2026-11-14", comment: "тест" };
  if (!(await post("/api/transactions", tx, owner)).ok) throw Error("Transaction creation failed");
  const txResult = await db.execute({ sql: "SELECT id,amount_minor FROM transactions WHERE user_id=?", args: [users[0]] });
  const txId = txResult.rows[0]?.id;
  if (!txId || Number(txResult.rows[0].amount_minor) !== 12345) throw Error("Amount conversion failed");
  if ((await post("/api/transactions", { ...tx, operation: "update", id: txId, amount: "2" }, other)).status !== 404) throw Error("Cross-user transaction update was not rejected");
  if ((await post("/api/transactions", { ...tx, amount: "0" }, owner)).status !== 400) throw Error("Zero amount accepted");
  if (!(await post("/api/transactions", { ...tx, operation: "update", id: txId, amount: "42.50" }, owner)).ok) throw Error("Transaction update failed");
  const archive = await post("/api/categories", { operation: "archive", id }, owner);
  if (!archive.ok) throw Error("Archive failed");
  const saved = await db.execute({ sql: "SELECT name,archived_at FROM categories WHERE id=?", args: [id] });
  if (saved.rows[0]?.name !== "Обновлённая" || !saved.rows[0]?.archived_at) throw Error("Archive did not preserve category");
  if ((await post("/api/transactions", tx, owner)).status !== 404) throw Error("Archived category accepted for new transaction");
  if (!(await post("/api/transactions", { operation: "delete", id: txId }, owner)).ok) throw Error("Transaction delete failed");
  console.log("Category and transaction creation, validation, isolation, updates and deletion passed.");
} finally {
  for (const id of users) {
    for (const table of ["transactions", "session", "account", "categories", "profiles", "currency_locks"]) await db.execute({ sql: `DELETE FROM ${table} WHERE user_id=?`, args: [id] });
    await db.execute({ sql: "DELETE FROM user WHERE id=?", args: [id] });
  }
  db.close();
}
