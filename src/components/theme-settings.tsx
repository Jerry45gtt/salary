"use client";
import { useState } from "react";

export function ThemeSettings({ initialTheme }: { initialTheme: "light" | "dark" }) {
  const [theme, setTheme] = useState(initialTheme);
  function change(value: "light" | "dark") {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    document.cookie = `salary-theme=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  return <section className="panel theme-settings"><h2>Внешний вид</h2><p>Тема сохраняется в этом браузере.</p><fieldset><legend>Тема приложения</legend><label className="theme-option"><input type="radio" name="theme" value="light" checked={theme === "light"} onChange={() => change("light")} /> Светлая</label><label className="theme-option"><input type="radio" name="theme" value="dark" checked={theme === "dark"} onChange={() => change("dark")} /> Тёмная</label></fieldset></section>;
}
