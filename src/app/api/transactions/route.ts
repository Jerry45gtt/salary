import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/current-user";
import { client } from "@/lib/db";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Войдите в аккаунт." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Недопустимый запрос." }, { status: 403 });
  let body: Record<string, unknown>;
  try { const parsed = await request.json(); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); body = parsed; }
  catch { return Response.json({ error: "Неверный запрос." }, { status: 400 }); }
  const operation = body.operation, id = typeof body.id === "string" ? body.id : "";
  if (operation === "delete") {
    const result = await client.execute({ sql: "DELETE FROM transactions WHERE id=? AND user_id=?", args: [id, user.id] });
    return result.rowsAffected ? Response.json({ ok: true }) : Response.json({ error: "Операция не найдена." }, { status: 404 });
  }
  if (operation !== "create" && operation !== "update") return Response.json({ error: "Неизвестное действие." }, { status: 400 });
  const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
  const type = body.type;
  const amount = typeof body.amount === "string" ? body.amount.trim().replace(",", ".") : "";
  const date = typeof body.date === "string" ? body.date : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if ((type !== "income" && type !== "expense") || !categoryId || (operation === "update" && !id) || !/^\d{1,12}(?:\.\d{1,2})?$/.test(amount) || comment.length > 500) return Response.json({ error: "Проверьте тип, категорию, сумму и комментарий (до 500 символов)." }, { status: 400 });
  const [whole, fraction = ""] = amount.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (!Number.isSafeInteger(minor) || minor <= 0 || !validDate) return Response.json({ error: "Укажите положительную сумму и корректную дату." }, { status: 400 });
  try {
    // The subquery enforces ownership, matching type and active category atomically.
    const now = new Date().toISOString();
    const result = operation === "create" ? await client.execute({ sql: "INSERT INTO transactions(id,user_id,category_id,type,amount_minor,date,comment,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM categories WHERE id=? AND user_id=? AND type=? AND archived_at IS NULL)", args: [randomUUID(), user.id, categoryId, type, minor, date, comment || null, now, now, categoryId, user.id, type] }) : await client.execute({ sql: "UPDATE transactions SET category_id=?,type=?,amount_minor=?,date=?,comment=?,updated_at=? WHERE id=? AND user_id=? AND EXISTS (SELECT 1 FROM categories WHERE id=? AND user_id=? AND type=? AND (archived_at IS NULL OR id=transactions.category_id))", args: [categoryId, type, minor, date, comment || null, now, id, user.id, categoryId, user.id, type] });
    if (!result.rowsAffected) return Response.json({ error: "Операция или доступная категория не найдена." }, { status: 404 });
    return Response.json({ ok: true });
  } catch { console.error("Transaction operation failed"); return Response.json({ error: "Не удалось сохранить операцию. Попробуйте позже." }, { status: 500 }); }
}
