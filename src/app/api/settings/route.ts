import { currentUser } from "@/lib/current-user";
import { client } from "@/lib/db";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Войдите в аккаунт." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Недопустимый запрос." }, { status: 403 });
  let currency: unknown;
  try { currency = (await request.json()).currency; } catch { return Response.json({ error: "Неверный запрос." }, { status: 400 }); }
  if (typeof currency !== "string" || !["UZS", "USD", "EUR", "RUB"].includes(currency)) return Response.json({ error: "Выберите доступную валюту." }, { status: 400 });
  const result = await client.execute({ sql: "UPDATE profiles SET currency=? WHERE user_id=? AND NOT EXISTS (SELECT 1 FROM currency_locks WHERE user_id=?)", args: [currency, user.id, user.id] });
  if (!result.rowsAffected) return Response.json({ error: "Валюта недоступна для изменения после первой операции." }, { status: 409 });
  return Response.json({ ok: true });
}
