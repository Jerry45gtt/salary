"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode, registered = false }: { mode: "login" | "register"; registered?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));
    try {
      const result = mode === "login" ? await authClient.signIn.email({ email, password }) : await authClient.signUp.email({ email, password, name: email.split("@")[0] });
      if (result.error) { setError("Не удалось продолжить. Проверьте данные или попробуйте ещё раз."); return; }
      router.push(mode === "login" ? "/dashboard" : "/login?registered=1"); router.refresh();
    } catch { setError("Не удалось подключиться. Попробуйте ещё раз."); }
    finally { setBusy(false); }
  }
  return <main><div className="card"><Link className="brand" href="/">SALARY</Link><h1>{mode === "login" ? "Вход" : "Создать аккаунт"}</h1>
    <p>{registered ? "Если регистрация прошла успешно, войдите с указанными данными." : mode === "login" ? "Войдите, чтобы продолжить." : "Начните вести личный финансовый учёт."}</p>
    <form onSubmit={submit} className="form"><label>Электронная почта<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>Пароль<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={busy}>{busy ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}</button></form>
    {mode === "login" && <p className="switch"><Link href="/forgot-password">Забыли пароль?</Link></p>}
    <p className="switch">{mode === "login" ? <>Нет аккаунта? <Link href="/register">Зарегистрироваться</Link></> : <>Уже есть аккаунт? <Link href="/login">Войти</Link></>}</p>
  </div></main>;
}
