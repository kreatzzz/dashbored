import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { passkey } from "@better-auth/passkey";
import { prisma } from "@/lib/prisma";

const baseURL = process.env.PORTLESS_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const trustedOrigins = [...new Set([baseURL, ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean)])];

export const auth = betterAuth({
  appName: "Dashbored",
  baseURL,
  // The placeholder is only used while Next.js evaluates modules during an image build.
  // Every runnable environment supplies a real secret through its environment.
  secret: process.env.BETTER_AUTH_SECRET ?? "dashbored-build-placeholder-never-use-runtime",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.ALLOW_SIGNUP !== "true",
    minPasswordLength: 12,
  },
  session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, window: 60, max: 10 },
  trustedOrigins,
  plugins: [
    passkey({ rpName: "Dashbored", origin: baseURL, rpID: new URL(baseURL).hostname }),
  ],
});

export type Session = typeof auth.$Infer.Session;
