type ResetEmail = { to: string; resetUrl: string; from: string; apiKey: string };

/** Only the delivery result is exposed; provider response bodies may contain sensitive data. */
export async function sendResetEmail(data: ResetEmail, send: typeof fetch = fetch): Promise<void> {
  const response = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${data.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: data.from,
      to: [data.to],
      subject: "Восстановление пароля Salary",
      text: `Чтобы установить новый пароль, перейдите по ссылке: ${data.resetUrl}\nСсылка действует один час. Если вы не запрашивали восстановление, проигнорируйте письмо.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Password reset email delivery failed");
}
