import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/current-user";
import { client } from "@/lib/db";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: "Недопустимый запрос." }, { status: 403 });
  let body: Record<string, unknown>;
  try { const parsed = await request.json(); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); body = parsed; }
  catch { return Response.json({ error: "Неверный запрос." }, { status: 400 }); }
  const operation = body.operation;
  const id = typeof body.id === "string" ? body.id : "";
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ").normalize("NFC") : "";
  const type = body.type;
  if ((operation === "create" || operation === "rename") && (name.length < 1 || name.length > 60)) return Response.json({ error: "Введите название от 1 до 60 символов." }, { status: 400 });
  if (operation === "create" && type !== "income" && type !== "expense") return Response.json({ error: "Выберите тип категории." }, { status: 400 });
  if ((operation === "rename" || operation === "archive") && !id) return Response.json({ error: "Категория не найдена." }, { status: 400 });
  try {
    let result;
    if (operation === "create") {
      result = await client.execute({ sql: "INSERT INTO categories(id,user_id,type,name,name_key,created_at) VALUES(?,?,?,?,?,?)", args: [randomUUID(), user.id, type as string, name, name.toLocaleLowerCase("ru-RU"), new Date().toISOString()] });
    } else if (operation === "rename") {
      result = await client.execute({ sql: "UPDATE categories SET name=?, name_key=? WHERE id=? AND user_id=? AND archived_at IS NULL", args: [name, name.toLocaleLowerCase("ru-RU"), id, user.id] });
    } else if (operation === "archive") {
      result = await client.execute({ sql: "UPDATE categories SET archived_at=? WHERE id=? AND user_id=? AND archived_at IS NULL", args: [new Date().toISOString(), id, user.id] });
    } else return Response.json({ error: "Неизвестное действие." }, { status: 400 });
    if (!result.rowsAffected) return Response.json({ error: "Категория не найдена или уже архивирована." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) return Response.json({ error: "Активная категория с таким названием уже существует." }, { status: 409 });
    console.error("Category operation failed");
    return Response.json({ error: "Не удалось сохранить категорию. Попробуйте позже." }, { status: 500 });
  }
}
