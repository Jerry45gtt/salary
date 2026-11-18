import assert from "node:assert/strict";
import { sendResetEmail } from "../src/lib/reset-email.ts";

const example = { to: "recipient@example.com", from: "Salary <sender@example.com>", resetUrl: "https://example.com/reset?token=test-only", apiKey: "test-api-key" };
let captured;
await sendResetEmail(example, async (url, options) => {
  captured = { url, options };
  return new Response(null, { status: 200 });
});
assert.equal(captured.url, "https://api.resend.com/emails");
assert.equal(captured.options.method, "POST");
assert.equal(captured.options.headers.Authorization, "Bearer test-api-key");
const payload = JSON.parse(captured.options.body);
assert.equal(payload.from, example.from);
assert.deepEqual(payload.to, [example.to]);
assert.ok(payload.text.includes(example.resetUrl));
assert.ok(captured.options.signal instanceof AbortSignal);
await assert.rejects(() => sendResetEmail(example, async () => new Response("sensitive provider detail", { status: 403 })), { message: "Password reset email delivery failed" });
await assert.rejects(() => sendResetEmail(example, async () => { throw new Error("network failed"); }));
console.log("Password reset email payload, failure handling and timeout passed with a mock; no email sent.");
