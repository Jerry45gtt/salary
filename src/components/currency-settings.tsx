"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CurrencySettings({ currency, locked }: { currency: string; locked: boolean }) {
  const [value, setValue] = useState(currency), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const router = useRouter();
  return <section className="panel welcome"><h2>Валюта учёта</h2><p>Выберите валюту до первой операции. После её добавления изменить валюту нельзя, даже если удалить запись.</p><form className="form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setMessage(""); try { const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: value }) }); const data = await response.json(); setMessage(response.ok ? "Валюта сохранена." : data.error || "Не удалось сохранить настройки."); if (response.ok) router.refresh(); } catch { setMessage("Не удалось подключиться. Попробуйте ещё раз."); } finally { setBusy(false); } }}><label>Валюта<select value={value} onChange={(event) => setValue(event.target.value)} disabled={locked || busy}><option value="UZS">UZS — узбекский сум</option><option value="USD">USD — доллар США</option><option value="EUR">EUR — евро</option><option value="RUB">RUB — российский рубль</option></select></label><button disabled={locked || busy}>Сохранить</button></form><p className="feedback" role="status">{locked ? "Валюта зафиксирована после первой операции." : message}</p></section>;
}
