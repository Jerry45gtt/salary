"use client";
import Link from "next/link";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main><div className="card"><span className="brand">SALARY</span><h1>Не удалось загрузить страницу</h1><p>Попробуйте ещё раз. Если проблема сохраняется, проверьте подключение или обратитесь к администратору приложения.</p><div className="actions"><button onClick={() => retry()}>Попробовать снова</button><Link href="/">На главную</Link></div></div></main>;
}
