"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function ResetForm({ mode, enabled = true }: { mode: "request" | "reset"; enabled?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "request") {
        const result = await authClient.requestPasswordReset({ email: String(form.get("email")).trim().toLowerCase(), redirectTo: `${window.location.origin}/reset-password` });
        setMessage(result.error ? "Не удалось выполнить запрос. Попробуйте позже." : "Если аккаунт с такой почтой существует, мы отправим письмо со ссылкой.");
      } else {
        const token = new URLSearchParams(window.location.search).get("token");
        if (!token) { setMessage("Ссылка недействительна. Запросите новую."); return; }
        const result = await authClient.resetPassword({ newPassword: String(form.get("password")), token });
        setMessage(result.error ? "Не удалось изменить пароль. Возможно, ссылка устарела. Запросите новую." : "Пароль изменён. Теперь можно войти.");
      }
    } catch { setMessage("Не удалось подключиться. Попробуйте позже."); }
    finally { setBusy(false); }
  }
  return <main><div className="card"><Link className="brand" href="/">SALARY</Link><h1>{mode === "request" ? "Восстановить пароль" : "Новый пароль"}</h1>
    {!enabled ? <p>Отправка писем пока не настроена. Обратитесь к администратору приложения.</p> : <form className="form" onSubmit={submit}>
      {mode === "request" ? <label>Электронная почта<input name="email" type="email" autoComplete="email" required maxLength={254} /></label> : <label>Новый пароль<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>}
      <button disabled={busy}>{busy ? "Подождите…" : mode === "request" ? "Отправить ссылку" : "Сохранить пароль"}</button>
    </form>}
    {message && <p className="switch" role="status">{message}</p>}
    <p className="switch"><Link href="/login">Вернуться ко входу</Link></p>
  </div></main>;
}
