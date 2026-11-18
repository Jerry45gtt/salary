import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";
import * as schema from "./schema";
import { after } from "next/server";
import { getIpHeaders } from "./ip-config";
import { sendResetEmail } from "./reset-email";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  advanced: { ipAddress: { ipAddressHeaders: getIpHeaders(process.env.NODE_ENV === "production", process.env.SALARY_CLIENT_IP_HEADER) } },
  verification: { storeIdentifier: "hashed" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    ...(process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? {
      sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
        const apiKey = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
        if (!apiKey || !from) throw new Error("Password reset email is not configured");
        after(async () => {
          try { await sendResetEmail({ to: user.email, resetUrl: url, from, apiKey }); }
          catch { console.error("Password reset email delivery failed"); }
        });
      },
    } : {}),
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 20 },
});
